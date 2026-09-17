"""
Spatial LookDev Prompt Compositor - Local Web Studio Backend
-----------------------------------------------------------
Lightweight, zero-dependency Python HTTP server supporting:
1. Static web UI serving (HTML, CSS, JS)
2. Live 3D Pass serving (/guides/<shot>/<file>)
3. One-click Shot deployment to ComfyUI input folder (/api/deploy_shot)
4. List available shots and shot metadata (/api/shots)
5. Pure dynamic ComfyUI workflow synthesizer (/api/inject_workflow)
"""

import http.server
import socketserver
import json
import os
import time
import shutil
import base64
import urllib.parse
import urllib.request
from pathlib import Path
import webbrowser

PORT = 8088
REPO_ROOT = Path(__file__).resolve().parents[2]
WEB_DIR = Path(__file__).resolve().parent
GUIDES_DIR = REPO_ROOT / "3d_guides"
COMFYUI_INPUT_DIR = Path(os.path.expanduser("~")) / "AppData/Local/Comfy-Desktop/ComfyUI-Shared/input"
COMFYUI_INSTALL_INPUT_DIR = Path(os.path.expanduser("~")) / "AppData/Local/Comfy-Desktop/ComfyUI-Installs/ComfyUI/ComfyUI/input"
WORKSPACE_INPUT_DIR = REPO_ROOT / "input"

WORKFLOWS_DIR = REPO_ROOT / "comfyui_workflows"
PRESETS_DIR = REPO_ROOT / "tools" / "prompt_compositor" / "presets"
PRESETS_DIR.mkdir(parents=True, exist_ok=True)
BUNNY_CONFIG_PATH = WEB_DIR / "bunny_config.json"

def get_target_input_dirs():
    targets = []
    if COMFYUI_INPUT_DIR.exists():
        targets.append(COMFYUI_INPUT_DIR)
    if COMFYUI_INSTALL_INPUT_DIR.exists():
        targets.append(COMFYUI_INSTALL_INPUT_DIR)
    WORKSPACE_INPUT_DIR.mkdir(parents=True, exist_ok=True)
    targets.append(WORKSPACE_INPUT_DIR)
    return targets

def load_bunny_config():
    if BUNNY_CONFIG_PATH.exists():
        try:
            with open(BUNNY_CONFIG_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return None

def upload_ref_image(file_bytes, filename, content_type="image/png"):
    targets = get_target_input_dirs()

    # 1. Mirror locally to ComfyUI input and workspace input
    saved_paths = []
    for target_dir in targets:
        target_path = target_dir / filename
        with open(target_path, "wb") as f:
            f.write(file_bytes)
        saved_paths.append(str(target_path))

    # 2. Auto upload to Bunny Storage & CDN
    cfg = load_bunny_config()
    cdn_url = ""
    bunny_status = "not_configured"
    if cfg and cfg.get("access_key") and cfg.get("storage_zone"):
        storage_zone = cfg["storage_zone"]
        access_key = cfg["access_key"]
        pull_zone = cfg.get("pull_zone", "")
        upload_path = cfg.get("upload_path", "Prompt_Compositor_Resources/ref_textures").strip("/")
        
        endpoint = f"https://storage.bunnycdn.com/{storage_zone}/{upload_path}/{filename}"
        try:
            req = urllib.request.Request(endpoint, data=file_bytes, method="PUT")
            req.add_header("AccessKey", access_key)
            req.add_header("Content-Type", content_type)
            with urllib.request.urlopen(req, timeout=15) as resp:
                if resp.status in (200, 201):
                    bunny_status = "uploaded"
                    if pull_zone:
                        cdn_url = f"https://{pull_zone}/{upload_path}/{filename}"
                else:
                    bunny_status = f"http_{resp.status}"
        except Exception as e:
            bunny_status = f"error: {str(e)}"
            print(f"[!] Bunny upload failed: {e}")

    return {
        "success": True,
        "filename": filename,
        "saved_paths": saved_paths,
        "bunny_status": bunny_status,
        "cdn_url": cdn_url
    }

def save_data_url_image(data_url_str, filename, fallback_color=(200, 200, 200)):
    if not data_url_str:
        return None
    try:
        targets = get_target_input_dirs()
        if data_url_str.startswith("data:image"):
            header, b64_data = data_url_str.split(",", 1)
            raw_bytes = base64.b64decode(b64_data)
        else:
            return None

        # Process and optimize image with PIL
        try:
            from PIL import Image
            import io
            img = Image.open(io.BytesIO(raw_bytes)).convert("RGB")
            # Resize if dimensions exceed 1024
            if img.width > 1024 or img.height > 1024:
                img.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
            
            buf = io.BytesIO()
            img.save(buf, format="WEBP", quality=90, method=6)
            optimized_bytes = buf.getvalue()
        except Exception as pil_err:
            optimized_bytes = raw_bytes

        for target_dir in targets:
            out_file = target_dir / filename
            with open(out_file, "wb") as f:
                f.write(optimized_bytes)
        return filename
    except Exception as e:
        print(f"[!] Error saving data URL image {filename}: {e}")
        return None

def deploy_shot_assets(shot_str):
    shot_dir = GUIDES_DIR / str(shot_str).zfill(4)
    cdn_base = "https://dj-portfolio-teaser.b-cdn.net/Neural_Cosmetic_Swatches/3d_guides"
    targets = []
    if COMFYUI_INPUT_DIR.exists():
        targets.append(COMFYUI_INPUT_DIR)
    WORKSPACE_INPUT_DIR.mkdir(parents=True, exist_ok=True)
    targets.append(WORKSPACE_INPUT_DIR)

    copied_files = []
    for target_dir in targets:
        legacy_bg = target_dir / "Mask_Background.png"
        if legacy_bg.exists():
            try:
                legacy_bg.unlink()
            except Exception:
                pass

    if shot_dir.exists() and any(shot_dir.glob("*.png")):
        for src_file in shot_dir.glob("*.png"):
            if src_file.name == "Mask_Background.png":
                continue
            for target_dir in targets:
                target_path = target_dir / src_file.name
                shutil.copy2(src_file, target_path)
            copied_files.append(src_file.name)
    else:
        cdn_files = ["Depth.png", "Normal.png", "Color.png", "Shading.png", "AO.png", "Mask_00.png"] + [f"Mask_{str(i).zfill(2)}.png" for i in range(1, 7)]
        for fname in cdn_files:
            url = f"{cdn_base}/{str(shot_str).zfill(4)}/{fname}"
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(req, timeout=10) as resp:
                    file_bytes = resp.read()
                    for target_dir in targets:
                        out_file = target_dir / fname
                        with open(out_file, "wb") as f:
                            f.write(file_bytes)
                    copied_files.append(fname)
            except Exception as e:
                print(f"[!] Warning: Could not fetch {url} ({e})")
    return copied_files

def generate_seadance_flux_workflow(payload):
    shot_str = str(payload.get("shot", "0085")).strip().zfill(4)
    flux_prompt = payload.get("flux_pos") or payload.get("flux_master", "")
    flux_denoise = float(payload.get("flux_denoise", 0.21))
    flux_guidance = float(payload.get("flux_guidance", 2.8))
    flux_lora_weight = float(payload.get("flux_lora_weight", 0.55))
    depth_pass_name = payload.get("depth_pass_file") or "Depth.png"

    nodes = []
    links = []
    node_map = {}
    node_id_counter = 0
    link_id_counter = 0

    def next_node_id():
        nonlocal node_id_counter
        node_id_counter += 1
        return node_id_counter

    def next_link_id():
        nonlocal link_id_counter
        link_id_counter += 1
        return link_id_counter

    def add_link(from_node, from_slot, to_node, to_slot, link_type):
        lid = next_link_id()
        links.append([lid, from_node, from_slot, to_node, to_slot, link_type])
        return lid

    # 1. Documentation Note Node
    note_id = next_node_id()
    nodes.append({
        "id": note_id,
        "type": "Note",
        "pos": [-1180, -120],
        "size": [1200, 120],
        "title": f"Spatial LookDev: ByteDance Seedance 2.5 + FLUX Hybrid Pipeline (Shot {shot_str})",
        "widgets_values": [
            f"Spatial LookDev 2-Stage Dynamic Pipeline (Shot {shot_str}) [ByteDance Seedance 2.5 + FLUX]\n---------------------------------------------------------------------------------------------------------\n• Stage 1 (ByteDance Seedance 2.5): Cloud API Reference Node with 3D Depth Video & Texture Reference.\n• Stage 2 (FLUX.1-dev LoRA Refiner): Apple Minimal Craft CMF refinement on extracted Still Frame (Denoise: {flux_denoise})."
        ],
        "color": "#1e293b",
        "bgcolor": "#0f172a"
    })

    # 2. Swatch 1 Texture Reference Loader
    ref_img_id = next_node_id()
    ref_img_node = {
        "id": ref_img_id,
        "type": "LoadImage",
        "pos": [-1180, 50],
        "size": [320, 320],
        "title": "1. Swatch Texture Reference (ref_p1.webp)",
        "widgets_values": ["ref_p1.webp", "image"],
        "outputs": [
            {"name": "IMAGE", "type": "IMAGE", "links": [], "slot_index": 0},
            {"name": "MASK", "type": "MASK", "links": None, "slot_index": 1}
        ]
    }
    nodes.append(ref_img_node)
    node_map[ref_img_id] = ref_img_node

    # 3. Background Reference Loader
    bg_img_id = next_node_id()
    bg_img_node = {
        "id": bg_img_id,
        "type": "LoadImage",
        "pos": [-1180, 420],
        "size": [320, 320],
        "title": "2. Floor Tabletop Reference (ref_p0_floor.webp)",
        "widgets_values": ["ref_p0_floor.webp", "image"],
        "outputs": [
            {"name": "IMAGE", "type": "IMAGE", "links": [], "slot_index": 0},
            {"name": "MASK", "type": "MASK", "links": None, "slot_index": 1}
        ]
    }
    nodes.append(bg_img_node)
    node_map[bg_img_id] = bg_img_node

    # 4. 3D Depth Image Loader & Video Packager
    depth_img_id = next_node_id()
    depth_img_node = {
        "id": depth_img_id,
        "type": "LoadImage",
        "pos": [-800, 50],
        "size": [320, 320],
        "title": f"3. 3D Depth Pass ({depth_pass_name})",
        "widgets_values": [depth_pass_name, "image"],
        "outputs": [
            {"name": "IMAGE", "type": "IMAGE", "links": [], "slot_index": 0},
            {"name": "MASK", "type": "MASK", "links": None, "slot_index": 1}
        ]
    }
    nodes.append(depth_img_node)
    node_map[depth_img_id] = depth_img_node

    # 4.1 Repeat Depth Image to 48 frames (2.0s at 24fps) to meet ByteDance 1.8s minimum requirement
    repeat_batch_id = next_node_id()
    repeat_batch_node = {
        "id": repeat_batch_id,
        "type": "RepeatImageBatch",
        "pos": [-480, 50],
        "size": [240, 90],
        "title": "Repeat Depth (48 Frames = 2.0s Video)",
        "widgets_values": [48],
        "inputs": [{"name": "image", "type": "IMAGE", "link": None}],
        "outputs": [{"name": "IMAGE", "type": "IMAGE", "links": [], "slot_index": 0}]
    }
    nodes.append(repeat_batch_node)
    node_map[repeat_batch_id] = repeat_batch_node
    l_depth_rep = add_link(depth_img_id, 0, repeat_batch_id, 0, "IMAGE")
    node_map[depth_img_id]["outputs"][0]["links"].append(l_depth_rep)
    repeat_batch_node["inputs"][0]["link"] = l_depth_rep

    create_vid_id = next_node_id()
    create_vid_node = {
        "id": create_vid_id,
        "type": "CreateVideo",
        "pos": [-220, 50],
        "size": [240, 120],
        "title": "Package 3D Depth to Video Stream",
        "widgets_values": [24, 8],
        "inputs": [
            {"name": "images", "type": "IMAGE", "link": None},
            {"name": "audio", "type": "AUDIO", "link": None},
            {"name": "fps", "type": "FLOAT", "link": None},
            {"name": "bit_depth", "type": "INT", "link": None}
        ],
        "outputs": [
            {"name": "VIDEO", "type": "VIDEO", "links": [], "slot_index": 0}
        ]
    }
    nodes.append(create_vid_node)
    node_map[create_vid_id] = create_vid_node
    l_depth_vid = add_link(repeat_batch_id, 0, create_vid_id, 0, "IMAGE")
    node_map[repeat_batch_id]["outputs"][0]["links"].append(l_depth_vid)
    create_vid_node["inputs"][0]["link"] = l_depth_vid

    # 5. ByteDance Seedance 2.5 Cloud Node
    seedance_node_id = next_node_id()
    seedance_node = {
        "id": seedance_node_id,
        "type": "ByteDance2ReferenceNode",
        "pos": [50, 50],
        "size": [480, 550],
        "title": "ByteDance Seedance 2.5 (High Precision 3D Spatial Tracking)",
        "widgets_values": [
            "Seedance 2.5",
            flux_prompt,
            "720p",
            "adaptive",
            10,
            False,
            "reference",
            "mp4",
            True,
            False,
            777777,
            "fixed",
            False
        ],
        "inputs": [
            {"name": "model", "type": "COMFY_DYNAMICCOMBO_V3", "link": None},
            {"name": "model.prompt", "type": "STRING", "link": None},
            {"name": "model.resolution", "type": "COMBO", "link": None},
            {"name": "model.ratio", "type": "COMBO", "link": None},
            {"name": "model.duration", "type": "INT", "link": None},
            {"name": "model.generate_audio", "type": "BOOLEAN", "link": None},
            {"name": "model.task_type", "type": "COMBO", "link": None},
            {"name": "model.output_format", "type": "COMBO", "link": None},
            {"name": "model.reference_images.image_1", "type": "IMAGE", "link": None},
            {"name": "model.reference_images.image_2", "type": "IMAGE", "link": None},
            {"name": "model.reference_videos.video_1", "type": "VIDEO", "link": None},
            {"name": "model.reference_videos.video_2", "type": "VIDEO", "link": None},
            {"name": "model.reference_audios.audio_1", "type": "AUDIO", "link": None},
            {"name": "model.reference_assets.asset_1", "type": "STRING", "link": None},
            {"name": "model.auto_downscale", "type": "BOOLEAN", "link": None},
            {"name": "model.auto_upscale", "type": "BOOLEAN", "link": None},
            {"name": "seed", "type": "INT", "link": None},
            {"name": "watermark", "type": "BOOLEAN", "link": None}
        ],
        "outputs": [
            {"name": "VIDEO", "type": "VIDEO", "links": [], "slot_index": 0}
        ]
    }
    nodes.append(seedance_node)
    node_map[seedance_node_id] = seedance_node

    l_ref1 = add_link(ref_img_id, 0, seedance_node_id, 8, "IMAGE")
    node_map[ref_img_id]["outputs"][0]["links"].append(l_ref1)
    seedance_node["inputs"][8]["link"] = l_ref1

    l_ref2 = add_link(bg_img_id, 0, seedance_node_id, 9, "IMAGE")
    node_map[bg_img_id]["outputs"][0]["links"].append(l_ref2)
    seedance_node["inputs"][9]["link"] = l_ref2

    l_vid1 = add_link(create_vid_id, 0, seedance_node_id, 10, "VIDEO")
    node_map[create_vid_id]["outputs"][0]["links"].append(l_vid1)
    seedance_node["inputs"][10]["link"] = l_vid1

    # 6. Extract Still Frame from Video Output
    get_comp_id = next_node_id()
    get_comp_node = {
        "id": get_comp_id,
        "type": "GetVideoComponents",
        "pos": [430, 50],
        "size": [240, 120],
        "title": "Extract Frames from Seedance Video",
        "widgets_values": [],
        "inputs": [{"name": "video", "type": "VIDEO", "link": None}],
        "outputs": [
            {"name": "images", "type": "IMAGE", "links": [], "slot_index": 0},
            {"name": "audio", "type": "AUDIO", "links": None, "slot_index": 1},
            {"name": "fps", "type": "FLOAT", "links": None, "slot_index": 2},
            {"name": "bit_depth", "type": "INT", "links": None, "slot_index": 3}
        ]
    }
    nodes.append(get_comp_node)
    node_map[get_comp_id] = get_comp_node
    l_vid_out = add_link(seedance_node_id, 0, get_comp_id, 0, "VIDEO")
    node_map[seedance_node_id]["outputs"][0]["links"].append(l_vid_out)
    get_comp_node["inputs"][0]["link"] = l_vid_out

    pick_still_id = next_node_id()
    pick_still_node = {
        "id": pick_still_id,
        "type": "ImageFromBatch",
        "pos": [720, 50],
        "size": [260, 110],
        "title": "Pick Still Frame (LookDev Frame 0)",
        "widgets_values": [0, 1],
        "inputs": [{"name": "image", "type": "IMAGE", "link": None}],
        "outputs": [{"name": "IMAGE", "type": "IMAGE", "links": [], "slot_index": 0}]
    }
    nodes.append(pick_still_node)
    node_map[pick_still_id] = pick_still_node
    l_imgs = add_link(get_comp_id, 0, pick_still_id, 0, "IMAGE")
    node_map[get_comp_id]["outputs"][0]["links"].append(l_imgs)
    pick_still_node["inputs"][0]["link"] = l_imgs

    # 6.1 Preview Node for Stage 1 SeaDance Still Image
    seedance_preview_id = next_node_id()
    seedance_preview_node = {
        "id": seedance_preview_id,
        "type": "PreviewImage",
        "pos": [720, 200],
        "size": [300, 320],
        "title": "🌊 1단계 SeaDance 2.5 원본 스틸 미리보기",
        "inputs": [{"name": "images", "type": "IMAGE", "link": None}]
    }
    nodes.append(seedance_preview_node)
    node_map[seedance_preview_id] = seedance_preview_node
    l_sea_prev = add_link(pick_still_id, 0, seedance_preview_id, 0, "IMAGE")
    node_map[pick_still_id]["outputs"][0]["links"].append(l_sea_prev)
    seedance_preview_node["inputs"][0]["link"] = l_sea_prev

    # 7. Stage 2: FLUX.1-dev Refiner Pipeline
    flux_unet_id = next_node_id()
    nodes.append({
        "id": flux_unet_id,
        "type": "UNETLoader",
        "pos": [1050, -100],
        "size": [320, 80],
        "title": "FLUX.1-dev UNET (Stage 2)",
        "widgets_values": ["flux1-dev-fp8.safetensors", "fp8_e4m3fn"],
        "outputs": [{"name": "MODEL", "type": "MODEL", "links": [], "slot_index": 0}]
    })
    node_map[flux_unet_id] = nodes[-1]

    flux_dual_clip_id = next_node_id()
    nodes.append({
        "id": flux_dual_clip_id,
        "type": "DualCLIPLoader",
        "pos": [1050, 0],
        "size": [320, 110],
        "title": "FLUX Dual CLIP (T5-XXL + CLIP-L)",
        "widgets_values": ["clip_l.safetensors", "t5xxl_fp8_e4m3fn.safetensors", "flux"],
        "outputs": [{"name": "CLIP", "type": "CLIP", "links": [], "slot_index": 0}]
    })
    node_map[flux_dual_clip_id] = nodes[-1]

    flux_vae_id = next_node_id()
    nodes.append({
        "id": flux_vae_id,
        "type": "VAELoader",
        "pos": [1050, 130],
        "size": [320, 80],
        "title": "FLUX VAE Loader",
        "widgets_values": ["ae.safetensors"],
        "outputs": [{"name": "VAE", "type": "VAE", "links": [], "slot_index": 0}]
    })
    node_map[flux_vae_id] = nodes[-1]

    flux_lora_id = next_node_id()
    flux_lora_node = {
        "id": flux_lora_id,
        "type": "LoraLoader",
        "pos": [1420, -100],
        "size": [320, 120],
        "title": "FLUX Apple LoRA Refiner",
        "widgets_values": ["apple_minimal_craft_flux_v1.safetensors", flux_lora_weight, flux_lora_weight],
        "inputs": [
            {"name": "model", "type": "MODEL", "link": None},
            {"name": "clip", "type": "CLIP", "link": None}
        ],
        "outputs": [
            {"name": "MODEL", "type": "MODEL", "links": [], "slot_index": 0},
            {"name": "CLIP", "type": "CLIP", "links": [], "slot_index": 1}
        ]
    }
    nodes.append(flux_lora_node)
    node_map[flux_lora_id] = flux_lora_node
    l_fu = add_link(flux_unet_id, 0, flux_lora_id, 0, "MODEL")
    node_map[flux_unet_id]["outputs"][0]["links"].append(l_fu)
    flux_lora_node["inputs"][0]["link"] = l_fu
    l_fc = add_link(flux_dual_clip_id, 0, flux_lora_id, 1, "CLIP")
    node_map[flux_dual_clip_id]["outputs"][0]["links"].append(l_fc)
    flux_lora_node["inputs"][1]["link"] = l_fc

    flux_pos_id = next_node_id()
    flux_pos_node = {
        "id": flux_pos_id,
        "type": "CLIPTextEncode",
        "pos": [1420, 40],
        "size": [380, 180],
        "title": "FLUX Master Positive Prompt",
        "widgets_values": [flux_prompt],
        "inputs": [{"name": "clip", "type": "CLIP", "link": None}],
        "outputs": [{"name": "CONDITIONING", "type": "CONDITIONING", "links": [], "slot_index": 0}]
    }
    nodes.append(flux_pos_node)
    node_map[flux_pos_id] = flux_pos_node
    l_f_pos_clip = add_link(flux_lora_id, 1, flux_pos_id, 0, "CLIP")
    node_map[flux_lora_id]["outputs"][1]["links"].append(l_f_pos_clip)
    flux_pos_node["inputs"][0]["link"] = l_f_pos_clip

    flux_guidance_id = next_node_id()
    flux_guidance_node = {
        "id": flux_guidance_id,
        "type": "FluxGuidance",
        "pos": [1830, 40],
        "size": [240, 80],
        "title": "FLUX Guidance (2.8)",
        "widgets_values": [flux_guidance],
        "inputs": [{"name": "conditioning", "type": "CONDITIONING", "link": None}],
        "outputs": [{"name": "CONDITIONING", "type": "CONDITIONING", "links": [], "slot_index": 0}]
    }
    nodes.append(flux_guidance_node)
    node_map[flux_guidance_id] = flux_guidance_node
    l_f_guid = add_link(flux_pos_id, 0, flux_guidance_id, 0, "CONDITIONING")
    node_map[flux_pos_id]["outputs"][0]["links"].append(l_f_guid)
    flux_guidance_node["inputs"][0]["link"] = l_f_guid

    flux_neg_id = next_node_id()
    flux_neg_node = {
        "id": flux_neg_id,
        "type": "CLIPTextEncode",
        "pos": [1420, 240],
        "size": [380, 90],
        "title": "FLUX Neg (Empty)",
        "widgets_values": [""],
        "inputs": [{"name": "clip", "type": "CLIP", "link": None}],
        "outputs": [{"name": "CONDITIONING", "type": "CONDITIONING", "links": [], "slot_index": 0}]
    }
    nodes.append(flux_neg_node)
    node_map[flux_neg_id] = flux_neg_node
    l_f_neg_clip = add_link(flux_lora_id, 1, flux_neg_id, 0, "CLIP")
    node_map[flux_lora_id]["outputs"][1]["links"].append(l_f_neg_clip)
    flux_neg_node["inputs"][0]["link"] = l_f_neg_clip

    vae_encode_id = next_node_id()
    vae_encode_node = {
        "id": vae_encode_id,
        "type": "VAEEncode",
        "pos": [1830, 150],
        "size": [240, 90],
        "title": "Encode Seedance Frame to FLUX Latent",
        "inputs": [
            {"name": "pixels", "type": "IMAGE", "link": None},
            {"name": "vae", "type": "VAE", "link": None}
        ],
        "outputs": [{"name": "LATENT", "type": "LATENT", "links": [], "slot_index": 0}]
    }
    nodes.append(vae_encode_node)
    node_map[vae_encode_id] = vae_encode_node
    l_enc_pix = add_link(pick_still_id, 0, vae_encode_id, 0, "IMAGE")
    node_map[pick_still_id]["outputs"][0]["links"].append(l_enc_pix)
    vae_encode_node["inputs"][0]["link"] = l_enc_pix
    l_enc_vae = add_link(flux_vae_id, 0, vae_encode_id, 1, "VAE")
    node_map[flux_vae_id]["outputs"][0]["links"].append(l_enc_vae)
    vae_encode_node["inputs"][1]["link"] = l_enc_vae

    flux_sampler_id = next_node_id()
    flux_sampler_node = {
        "id": flux_sampler_id,
        "type": "KSampler",
        "pos": [2120, 50],
        "size": [320, 380],
        "title": "FLUX Stage 2 LoRA Refiner (Denoise 0.21)",
        "widgets_values": [
            777777,
            "randomize",
            20,
            1.0,
            "euler",
            "simple",
            flux_denoise
        ],
        "inputs": [
            {"name": "model", "type": "MODEL", "link": None},
            {"name": "positive", "type": "CONDITIONING", "link": None},
            {"name": "negative", "type": "CONDITIONING", "link": None},
            {"name": "latent_image", "type": "LATENT", "link": None}
        ],
        "outputs": [{"name": "LATENT", "type": "LATENT", "links": [], "slot_index": 0}]
    }
    nodes.append(flux_sampler_node)
    node_map[flux_sampler_id] = flux_sampler_node
    l_f_samp_m = add_link(flux_lora_id, 0, flux_sampler_id, 0, "MODEL")
    node_map[flux_lora_id]["outputs"][0]["links"].append(l_f_samp_m)
    flux_sampler_node["inputs"][0]["link"] = l_f_samp_m
    l_f_samp_p = add_link(flux_guidance_id, 0, flux_sampler_id, 1, "CONDITIONING")
    node_map[flux_guidance_id]["outputs"][0]["links"].append(l_f_samp_p)
    flux_sampler_node["inputs"][1]["link"] = l_f_samp_p
    l_f_samp_n = add_link(flux_neg_id, 0, flux_sampler_id, 2, "CONDITIONING")
    node_map[flux_neg_id]["outputs"][0]["links"].append(l_f_samp_n)
    flux_sampler_node["inputs"][2]["link"] = l_f_samp_n
    l_f_samp_l = add_link(vae_encode_id, 0, flux_sampler_id, 3, "LATENT")
    node_map[vae_encode_id]["outputs"][0]["links"].append(l_f_samp_l)
    flux_sampler_node["inputs"][3]["link"] = l_f_samp_l

    flux_decode_id = next_node_id()
    flux_decode_node = {
        "id": flux_decode_id,
        "type": "VAEDecode",
        "pos": [2480, 50],
        "size": [240, 90],
        "title": "Decode Final FLUX Refined Image",
        "inputs": [
            {"name": "samples", "type": "LATENT", "link": None},
            {"name": "vae", "type": "VAE", "link": None}
        ],
        "outputs": [{"name": "IMAGE", "type": "IMAGE", "links": [], "slot_index": 0}]
    }
    nodes.append(flux_decode_node)
    node_map[flux_decode_id] = flux_decode_node
    l_f_dec_l = add_link(flux_sampler_id, 0, flux_decode_id, 0, "LATENT")
    node_map[flux_sampler_id]["outputs"][0]["links"].append(l_f_dec_l)
    flux_decode_node["inputs"][0]["link"] = l_f_dec_l
    l_f_dec_v = add_link(flux_vae_id, 0, flux_decode_id, 1, "VAE")
    node_map[flux_vae_id]["outputs"][0]["links"].append(l_f_dec_v)
    flux_decode_node["inputs"][1]["link"] = l_f_dec_v

    save_node_id = next_node_id()
    save_node = {
        "id": save_node_id,
        "type": "SaveImage",
        "pos": [2750, 50],
        "size": [360, 420],
        "title": "👑 Final Apple LookDev (Seedance + FLUX)",
        "widgets_values": [f"apple_spatial_shot{shot_str}_seedance_flux"],
        "inputs": [{"name": "images", "type": "IMAGE", "link": None}]
    }
    nodes.append(save_node)
    node_map[save_node_id] = save_node
    l_save = add_link(flux_decode_id, 0, save_node_id, 0, "IMAGE")
    node_map[flux_decode_id]["outputs"][0]["links"].append(l_save)
    save_node["inputs"][0]["link"] = l_save

    return {
        "last_node_id": node_id_counter,
        "last_link_id": link_id_counter,
        "nodes": nodes,
        "links": links,
        "groups": [
            {
                "title": "⚡ 1. BYTEDANCE SEEDANCE 2.5 (3D DEPTH + TEXTURE REFERENCE)",
                "bounding": [-1210, -30, 2220, 800],
                "color": "#1e293b",
                "font_size": 24
            },
            {
                "title": "✨ 2. FLUX.1-DEV APPLE LORA REFINER (CMF POLISH & STUDIO TONE)",
                "bounding": [1030, -120, 2120, 890],
                "color": "#0369a1",
                "font_size": 24
            }
        ],
        "config": {},
        "extra": {},
        "version": 0.4
    }

def generate_dynamic_workflow(payload):
    stage1_engine = payload.get("stage1_engine") or payload.get("stage1Engine") or "sdxl"
    if stage1_engine == "seadance":
        return generate_seadance_flux_workflow(payload)

    shot_str = str(payload.get("shot", "0085")).strip().zfill(4)
    depth_strength = float(payload.get("depth_strength", 0.30))
    depth_start = float(payload.get("depth_start", 0.0))
    depth_end = float(payload.get("depth_end", 0.35))
    
    normal_strength = float(payload.get("normal_strength", 0.20))
    normal_start = float(payload.get("normal_start", 0.0))
    normal_end = float(payload.get("normal_end", 0.35))
    
    sdxl_cfg = float(payload.get("sdxl_cfg", 5.5))
    sdxl_denoise = float(payload.get("sdxl_denoise", 1.0))
    
    flux_cfg = float(payload.get("flux_cfg", 1.0))
    flux_denoise = float(payload.get("flux_denoise", 0.25))
    
    sdxl_global_pos = payload.get("sdxl_global_pos") or payload.get("sdxl_master") or payload.get("global_scene", "((top-down flat lay view, all cosmetic swatches resting firmly on tabletop surface with razor-sharp pitch-black contact shadow seams hugging all bottom edges, clean ambient occlusion fill, photorealistic luxury lookdev):0.35)")
    global_neg = payload.get("global_neg") or payload.get("negative", "blurry, noise, grain, low quality, artifacts, distorted geometry, cracks, micro-cracks")
    flux_pos = payload.get("flux_pos") or payload.get("flux_master", "")
    
    use_sdxl_lora = bool(payload.get("use_sdxl_lora", False))
    sdxl_lora_strength = float(payload.get("sdxl_lora_strength", 0.95))

    bg_info = payload.get("background") or {}
    regional = payload.get("regional") or {}

    pieces = []
    # P0 Floor
    p0_use_img = payload.get("p0_use_image", bg_info.get("use_image", bg_info.get("use_img", bg_info.get("useImage", True))))
    p0_use_pos = payload.get("p0_use_pos_text", bg_info.get("use_pos_text", bg_info.get("use_pos", bg_info.get("usePosText", True))))
    p0_use_neg = payload.get("p0_use_neg_text", bg_info.get("use_neg_text", bg_info.get("use_neg", bg_info.get("useNegText", False))))
    p0_img_w = float(payload.get("p0_image_weight", bg_info.get("image_weight", bg_info.get("imageWeight", 0.95))))
    p0_prompt_w = float(payload.get("p0_prompt_weight", bg_info.get("prompt_weight", bg_info.get("promptWeight", 1.00))))
    p0_pos_prompt = bg_info.get("prompt", "clean matte studio tabletop surface, seamless non-reflective finish, zero glare")
    p0_neg_prompt = bg_info.get("negative_prompt") or global_neg

    pieces.append({
        "tag": "P0",
        "name": "Floor Tabletop",
        "mask_file": "Mask_00.png",
        "pos_prompt": p0_pos_prompt,
        "neg_prompt": p0_neg_prompt,
        "use_image": p0_use_img,
        "use_pos": p0_use_pos,
        "use_neg": p0_use_neg,
        "image_weight": p0_img_w,
        "prompt_weight": p0_prompt_w,
        "ref_file": "ref_p0_floor.webp"
    })

    # P1 ~ P6 Swatches
    for p_idx in range(1, 7):
        p_key = f"Part_{str(p_idx).zfill(2)}"
        p_val = None
        if isinstance(regional, list):
            if (p_idx - 1) < len(regional):
                p_val = regional[p_idx - 1]
        elif isinstance(regional, dict):
            p_val = regional.get(p_key) or regional.get(f"Part_{p_idx}") or regional.get(f"Part {p_idx}")

        if p_val is None and (isinstance(regional, list) or (isinstance(regional, dict) and len(regional) > 0)):
            continue

        p_val = p_val or {}
        s_use_img = p_val.get("use_image", p_val.get("useImage", True))
        s_use_pos = p_val.get("use_pos_text", p_val.get("usePosText", True))
        s_use_neg = p_val.get("use_neg_text", p_val.get("useNegText", False))
        s_img_w = float(p_val.get("image_weight", p_val.get("imageWeight", 0.95)))
        s_prompt_w = float(p_val.get("prompt_weight", p_val.get("promptWeight", 1.00)))
        s_pos_prompt = p_val.get("prompt", "")
        s_neg_prompt = p_val.get("negative_prompt") or global_neg

        if not s_use_img and not s_use_pos and not s_use_neg and not s_pos_prompt:
            continue

        pieces.append({
            "tag": f"P{p_idx}",
            "name": p_val.get("part_name", f"Part {p_idx}"),
            "mask_file": f"Mask_{str(p_idx).zfill(2)}.png",
            "pos_prompt": s_pos_prompt,
            "neg_prompt": s_neg_prompt,
            "use_image": s_use_img,
            "use_pos": s_use_pos,
            "use_neg": s_use_neg,
            "image_weight": s_img_w,
            "prompt_weight": s_prompt_w,
            "ref_file": f"ref_p{p_idx}.webp"
        })

    nodes = []
    links = []
    node_map = {}
    node_id_counter = 0
    link_id_counter = 0

    def next_node_id():
        nonlocal node_id_counter
        node_id_counter += 1
        return node_id_counter

    def next_link_id():
        nonlocal link_id_counter
        link_id_counter += 1
        return link_id_counter

    def add_link(from_node, from_slot, to_node, to_slot, link_type):
        lid = next_link_id()
        links.append([lid, from_node, from_slot, to_node, to_slot, link_type])
        return lid

    # Documentation Note
    note_id = next_node_id()
    nodes.append({
        "id": note_id,
        "type": "Note",
        "pos": [50, -180],
        "size": [1200, 140],
        "title": "Spatial LookDev Dynamic Synthesized Pipeline",
        "widgets_values": [
            f"Spatial LookDev 2-Stage Dynamic Pipeline (Shot {shot_str})\n---------------------------------------------------------------------------------------------------------\n• Stage 1 (SDXL Base): 7-Part Regional conditioning with per-piece independent Positive & Negative prompts.\n  - Image-active pieces route through IP-Adapter regional conditioning.\n  - Text-only pieces route through native ConditioningSetMask (Zero VRAM, fast & native).\n  - Balanced Binary Tree combining for all positive & negative conditionings.\n• Stage 2 (FLUX.1-dev LoRA Refiner): Apple Minimal Craft CMF refinement (Denoise: {flux_denoise})."
        ],
        "color": "#234433",
        "bgcolor": "#1e3a29"
    })

    stage1_engine = payload.get("stage1_engine") or payload.get("stage1Engine") or "sdxl"
    is_seadance = stage1_engine == "seadance"
    stage1_name = "SeaDance 2.5 Base" if is_seadance else "SDXL Base"
    stage1_ckpt = "seadance_v2.5.safetensors" if is_seadance else "sd_xl_base_1.0.safetensors"

    # Stage 1 Base Checkpoint Loader (SDXL or SeaDance 2.5)
    sdxl_ckpt_id = next_node_id()
    sdxl_ckpt_node = {
        "id": sdxl_ckpt_id,
        "type": "CheckpointLoaderSimple",
        "pos": [50, 0],
        "size": [320, 110],
        "title": f"{stage1_name} Checkpoint",
        "widgets_values": [stage1_ckpt],
        "outputs": [
            {"name": "MODEL", "type": "MODEL", "links": [], "slot_index": 0},
            {"name": "CLIP", "type": "CLIP", "links": [], "slot_index": 1},
            {"name": "VAE", "type": "VAE", "links": [], "slot_index": 2}
        ]
    }
    nodes.append(sdxl_ckpt_node)
    node_map[sdxl_ckpt_id] = sdxl_ckpt_node

    active_sdxl_model_source = (sdxl_ckpt_id, 0)
    active_sdxl_clip_source = (sdxl_ckpt_id, 1)

    # SDXL Apple LoRA Loader (Conditional)
    if use_sdxl_lora:
        sdxl_lora_id = next_node_id()
        sdxl_lora_node = {
            "id": sdxl_lora_id,
            "type": "LoraLoader",
            "pos": [50, 140],
            "size": [320, 120],
            "title": "Load SDXL Apple LoRA",
            "widgets_values": ["apple_minimal_craft_sdxl_v1.safetensors", sdxl_lora_strength, sdxl_lora_strength],
            "inputs": [
                {"name": "model", "type": "MODEL", "link": None},
                {"name": "clip", "type": "CLIP", "link": None}
            ],
            "outputs": [
                {"name": "MODEL", "type": "MODEL", "links": [], "slot_index": 0},
                {"name": "CLIP", "type": "CLIP", "links": [], "slot_index": 1}
            ]
        }
        nodes.append(sdxl_lora_node)
        node_map[sdxl_lora_id] = sdxl_lora_node

        l_lora_m = add_link(sdxl_ckpt_id, 0, sdxl_lora_id, 0, "MODEL")
        sdxl_ckpt_node["outputs"][0]["links"].append(l_lora_m)
        sdxl_lora_node["inputs"][0]["link"] = l_lora_m

        l_lora_c = add_link(sdxl_ckpt_id, 1, sdxl_lora_id, 1, "CLIP")
        sdxl_ckpt_node["outputs"][1]["links"].append(l_lora_c)
        sdxl_lora_node["inputs"][1]["link"] = l_lora_c

        active_sdxl_model_source = (sdxl_lora_id, 0)
        active_sdxl_clip_source = (sdxl_lora_id, 1)

    # Empty Latent Image
    latent_id = next_node_id()
    latent_node = {
        "id": latent_id,
        "type": "EmptyLatentImage",
        "pos": [50, 450],
        "size": [320, 110],
        "title": "Empty Latent Image (1024x1024)",
        "widgets_values": [1024, 1024, 1],
        "outputs": [
            {"name": "LATENT", "type": "LATENT", "links": [], "slot_index": 0}
        ]
    }
    nodes.append(latent_node)
    node_map[latent_id] = latent_node

    # Check if any piece uses image
    has_image_pieces = any(p["use_image"] for p in pieces)
    ip_model_id = None
    clip_vision_id = None

    if has_image_pieces:
        ip_model_id = next_node_id()
        ip_model_node = {
            "id": ip_model_id,
            "type": "IPAdapterModelLoader",
            "pos": [50, 240],
            "size": [320, 90],
            "title": "Load IPAdapter Model",
            "widgets_values": ["ip-adapter-plus_sdxl_vit-h.safetensors"],
            "outputs": [{"name": "IPADAPTER", "type": "IPADAPTER", "links": [], "slot_index": 0}]
        }
        nodes.append(ip_model_node)
        node_map[ip_model_id] = ip_model_node

        clip_vision_id = next_node_id()
        clip_vision_node = {
            "id": clip_vision_id,
            "type": "CLIPVisionLoader",
            "pos": [50, 350],
            "size": [320, 90],
            "title": "Load CLIP Vision",
            "widgets_values": ["CLIP-ViT-H-14-laion2B-s32B-b79K.safetensors"],
            "outputs": [{"name": "CLIP_VISION", "type": "CLIP_VISION", "links": [], "slot_index": 0}]
        }
        nodes.append(clip_vision_node)
        node_map[clip_vision_id] = clip_vision_node

    # Global Scene Positive & Negative
    sdxl_scene_pos_id = next_node_id()
    sdxl_scene_pos_node = {
        "id": sdxl_scene_pos_id,
        "type": "CLIPTextEncode",
        "pos": [50, 600],
        "size": [380, 130],
        "title": "SDXL Global Scene Positive",
        "widgets_values": [sdxl_global_pos],
        "inputs": [{"name": "clip", "type": "CLIP", "link": None}],
        "outputs": [{"name": "CONDITIONING", "type": "CONDITIONING", "links": [], "slot_index": 0}]
    }
    nodes.append(sdxl_scene_pos_node)
    node_map[sdxl_scene_pos_id] = sdxl_scene_pos_node
    l_clip_scene = add_link(active_sdxl_clip_source[0], active_sdxl_clip_source[1], sdxl_scene_pos_id, 0, "CLIP")
    node_map[active_sdxl_clip_source[0]]["outputs"][active_sdxl_clip_source[1]]["links"].append(l_clip_scene)
    sdxl_scene_pos_node["inputs"][0]["link"] = l_clip_scene

    sdxl_scene_neg_id = next_node_id()
    sdxl_scene_neg_node = {
        "id": sdxl_scene_neg_id,
        "type": "CLIPTextEncode",
        "pos": [50, 750],
        "size": [380, 130],
        "title": "SDXL Global Negative",
        "widgets_values": [global_neg],
        "inputs": [{"name": "clip", "type": "CLIP", "link": None}],
        "outputs": [{"name": "CONDITIONING", "type": "CONDITIONING", "links": [], "slot_index": 0}]
    }
    nodes.append(sdxl_scene_neg_node)
    node_map[sdxl_scene_neg_id] = sdxl_scene_neg_node
    l_clip_neg = add_link(active_sdxl_clip_source[0], active_sdxl_clip_source[1], sdxl_scene_neg_id, 0, "CLIP")
    node_map[active_sdxl_clip_source[0]]["outputs"][active_sdxl_clip_source[1]]["links"].append(l_clip_neg)
    sdxl_scene_neg_node["inputs"][0]["link"] = l_clip_neg

    # Regional Pieces Generation
    piece_pos_conds = []
    piece_neg_conds = []
    ip_param_outputs = []
    y_offset = 0

    for idx, piece in enumerate(pieces):
        p_tag = piece["tag"]
        p_name = piece["name"]
        mask_file = piece["mask_file"]
        pos_prompt = piece["pos_prompt"]
        neg_prompt = piece["neg_prompt"]
        use_img = piece["use_image"]
        use_pos = piece["use_pos"]
        use_neg = piece["use_neg"]
        img_w = float(piece.get("image_weight", 0.95))
        prompt_w = float(piece.get("prompt_weight", 1.00))
        ref_file = piece["ref_file"]

        cur_y = y_offset

        # Mask Node
        mask_node_id = next_node_id()
        mask_node = {
            "id": mask_node_id,
            "type": "LoadImage",
            "pos": [500, cur_y],
            "size": [260, 240],
            "title": f"[{p_tag}] 3D Mask ({mask_file})",
            "widgets_values": [mask_file, "image"],
            "outputs": [
                {"name": "IMAGE", "type": "IMAGE", "links": [], "slot_index": 0},
                {"name": "MASK", "type": "MASK", "links": [], "slot_index": 1}
            ]
        }
        nodes.append(mask_node)
        node_map[mask_node_id] = mask_node

        # Pos Prompt Node
        pos_node_id = next_node_id()
        pos_node = {
            "id": pos_node_id,
            "type": "CLIPTextEncode",
            "pos": [800, cur_y],
            "size": [370, 130],
            "title": f"[{p_tag}] Positive Prompt ({p_name})",
            "widgets_values": [pos_prompt],
            "mode": 0 if use_pos else 4,
            "inputs": [{"name": "clip", "type": "CLIP", "link": None}],
            "outputs": [{"name": "CONDITIONING", "type": "CONDITIONING", "links": [], "slot_index": 0}]
        }
        nodes.append(pos_node)
        node_map[pos_node_id] = pos_node
        l_pos_clip = add_link(active_sdxl_clip_source[0], active_sdxl_clip_source[1], pos_node_id, 0, "CLIP")
        node_map[active_sdxl_clip_source[0]]["outputs"][active_sdxl_clip_source[1]]["links"].append(l_pos_clip)
        pos_node["inputs"][0]["link"] = l_pos_clip

        # Neg Prompt Node
        neg_node_id = next_node_id()
        neg_node = {
            "id": neg_node_id,
            "type": "CLIPTextEncode",
            "pos": [800, cur_y + 145],
            "size": [370, 125],
            "title": f"[{p_tag}] Negative Prompt ({p_name})",
            "widgets_values": [neg_prompt],
            "mode": 0 if use_neg else 4,
            "inputs": [{"name": "clip", "type": "CLIP", "link": None}],
            "outputs": [{"name": "CONDITIONING", "type": "CONDITIONING", "links": [], "slot_index": 0}]
        }
        nodes.append(neg_node)
        node_map[neg_node_id] = neg_node
        l_neg_clip = add_link(active_sdxl_clip_source[0], active_sdxl_clip_source[1], neg_node_id, 0, "CLIP")
        node_map[active_sdxl_clip_source[0]]["outputs"][active_sdxl_clip_source[1]]["links"].append(l_neg_clip)
        neg_node["inputs"][0]["link"] = l_neg_clip

        if use_img:
            # IP-Adapter Regional Conditioning
            ref_node_id = next_node_id()
            ref_node = {
                "id": ref_node_id,
                "type": "LoadImage",
                "pos": [1200, cur_y],
                "size": [260, 240],
                "title": f"[{p_tag}] Ref Texture ({ref_file})",
                "widgets_values": [ref_file, "image"],
                "outputs": [
                    {"name": "IMAGE", "type": "IMAGE", "links": [], "slot_index": 0},
                    {"name": "MASK", "type": "MASK", "links": [], "slot_index": 1}
                ]
            }
            nodes.append(ref_node)
            node_map[ref_node_id] = ref_node

            ipreg_id = next_node_id()
            ipreg_node = {
                "id": ipreg_id,
                "type": "IPAdapterRegionalConditioning",
                "pos": [1500, cur_y],
                "size": [280, 280],
                "title": f"[{p_tag}] IPAdapter Regional Cond",
                "widgets_values": [img_w, prompt_w if use_pos else 0.0, "linear", 0.0, 1.0],
                "inputs": [
                    {"name": "mask", "type": "MASK", "link": None},
                    {"name": "image", "type": "IMAGE", "link": None},
                    {"name": "positive", "type": "CONDITIONING", "link": None},
                    {"name": "negative", "type": "CONDITIONING", "link": None}
                ],
                "outputs": [
                    {"name": "IPADAPTER_PARAMS", "type": "IPADAPTER_PARAMS", "links": [], "slot_index": 0},
                    {"name": "POSITIVE", "type": "CONDITIONING", "links": [], "slot_index": 1},
                    {"name": "NEGATIVE", "type": "CONDITIONING", "links": [], "slot_index": 2}
                ]
            }
            nodes.append(ipreg_node)
            node_map[ipreg_id] = ipreg_node

            l_mask = add_link(mask_node_id, 1, ipreg_id, 0, "MASK")
            mask_node["outputs"][1]["links"].append(l_mask)
            ipreg_node["inputs"][0]["link"] = l_mask

            l_ref = add_link(ref_node_id, 0, ipreg_id, 1, "IMAGE")
            ref_node["outputs"][0]["links"].append(l_ref)
            ipreg_node["inputs"][1]["link"] = l_ref

            l_pos = add_link(pos_node_id, 0, ipreg_id, 2, "CONDITIONING")
            pos_node["outputs"][0]["links"].append(l_pos)
            ipreg_node["inputs"][2]["link"] = l_pos

            l_neg = add_link(neg_node_id, 0, ipreg_id, 3, "CONDITIONING")
            neg_node["outputs"][0]["links"].append(l_neg)
            ipreg_node["inputs"][3]["link"] = l_neg

            ip_param_outputs.append((ipreg_id, 0))
            piece_pos_conds.append((ipreg_id, 1))
            if use_neg:
                piece_neg_conds.append((ipreg_id, 2))
        else:
            # Pure Text Mode: ConditioningSetMask (Zero VRAM, fast & native)
            setmask_pos_id = next_node_id()
            setmask_pos_node = {
                "id": setmask_pos_id,
                "type": "ConditioningSetMask",
                "pos": [1200, cur_y],
                "size": [260, 110],
                "title": f"[{p_tag}] Set Mask (Positive)",
                "widgets_values": [prompt_w],
                "inputs": [
                    {"name": "conditioning", "type": "CONDITIONING", "link": None},
                    {"name": "mask", "type": "MASK", "link": None}
                ],
                "outputs": [
                    {"name": "CONDITIONING", "type": "CONDITIONING", "links": [], "slot_index": 0}
                ]
            }
            nodes.append(setmask_pos_node)
            node_map[setmask_pos_id] = setmask_pos_node

            l_pos_cond = add_link(pos_node_id, 0, setmask_pos_id, 0, "CONDITIONING")
            pos_node["outputs"][0]["links"].append(l_pos_cond)
            setmask_pos_node["inputs"][0]["link"] = l_pos_cond

            l_pos_mask = add_link(mask_node_id, 1, setmask_pos_id, 1, "MASK")
            mask_node["outputs"][1]["links"].append(l_pos_mask)
            setmask_pos_node["inputs"][1]["link"] = l_pos_mask

            piece_pos_conds.append((setmask_pos_id, 0))

            if use_neg:
                setmask_neg_id = next_node_id()
                setmask_neg_node = {
                    "id": setmask_neg_id,
                    "type": "ConditioningSetMask",
                    "pos": [1200, cur_y + 130],
                    "size": [260, 110],
                    "title": f"[{p_tag}] Set Mask (Negative)",
                    "widgets_values": [prompt_w],
                    "inputs": [
                        {"name": "conditioning", "type": "CONDITIONING", "link": None},
                        {"name": "mask", "type": "MASK", "link": None}
                    ],
                    "outputs": [
                        {"name": "CONDITIONING", "type": "CONDITIONING", "links": [], "slot_index": 0}
                    ]
                }
                nodes.append(setmask_neg_node)
                node_map[setmask_neg_id] = setmask_neg_node

                l_neg_cond = add_link(neg_node_id, 0, setmask_neg_id, 0, "CONDITIONING")
                neg_node["outputs"][0]["links"].append(l_neg_cond)
                setmask_neg_node["inputs"][0]["link"] = l_neg_cond

                l_neg_mask = add_link(mask_node_id, 1, setmask_neg_id, 1, "MASK")
                mask_node["outputs"][1]["links"].append(l_neg_mask)
                setmask_neg_node["inputs"][1]["link"] = l_neg_mask

                piece_neg_conds.append((setmask_neg_id, 0))

        y_offset += 300

    # IP-Adapter Combine Tree
    if len(ip_param_outputs) > 0:
        current_ip_layer = ip_param_outputs
        combine_x = 1850
        while len(current_ip_layer) > 1:
            next_ip_layer = []
            for i in range(0, len(current_ip_layer), 2):
                if i + 1 < len(current_ip_layer):
                    p1 = current_ip_layer[i]
                    p2 = current_ip_layer[i + 1]
                    comb_id = next_node_id()
                    comb_node = {
                        "id": comb_id,
                        "type": "IPAdapterCombineParams",
                        "pos": [combine_x, i * 150],
                        "size": [280, 90],
                        "title": f"IPAdapter Combine ({i}+{i+1})",
                        "inputs": [
                            {"name": "params_1", "type": "IPADAPTER_PARAMS", "link": None},
                            {"name": "params_2", "type": "IPADAPTER_PARAMS", "link": None}
                        ],
                        "outputs": [
                            {"name": "IPADAPTER_PARAMS", "type": "IPADAPTER_PARAMS", "links": [], "slot_index": 0}
                        ]
                    }
                    nodes.append(comb_node)
                    node_map[comb_id] = comb_node

                    l1 = add_link(p1[0], p1[1], comb_id, 0, "IPADAPTER_PARAMS")
                    node_map[p1[0]]["outputs"][p1[1]]["links"].append(l1)
                    comb_node["inputs"][0]["link"] = l1

                    l2 = add_link(p2[0], p2[1], comb_id, 1, "IPADAPTER_PARAMS")
                    node_map[p2[0]]["outputs"][p2[1]]["links"].append(l2)
                    comb_node["inputs"][1]["link"] = l2

                    next_ip_layer.append((comb_id, 0))
                else:
                    next_ip_layer.append(current_ip_layer[i])
            current_ip_layer = next_ip_layer
            combine_x += 320

        final_ip_params = current_ip_layer[0]

        from_params_id = next_node_id()
        from_params_node = {
            "id": from_params_id,
            "type": "IPAdapterFromParams",
            "pos": [combine_x + 50, 300],
            "size": [340, 180],
            "title": "IPAdapter From Params",
            "widgets_values": ["concat", "V only"],
            "inputs": [
                {"name": "model", "type": "MODEL", "link": None},
                {"name": "ipadapter_params", "type": "IPADAPTER_PARAMS", "link": None},
                {"name": "ipadapter", "type": "IPADAPTER", "link": None},
                {"name": "clip_vision", "type": "CLIP_VISION", "link": None}
            ],
            "outputs": [
                {"name": "MODEL", "type": "MODEL", "links": [], "slot_index": 0}
            ]
        }
        nodes.append(from_params_node)
        node_map[from_params_id] = from_params_node

        l_mod = add_link(active_sdxl_model_source[0], active_sdxl_model_source[1], from_params_id, 0, "MODEL")
        node_map[active_sdxl_model_source[0]]["outputs"][active_sdxl_model_source[1]]["links"].append(l_mod)
        from_params_node["inputs"][0]["link"] = l_mod

        l_ipp = add_link(final_ip_params[0], final_ip_params[1], from_params_id, 1, "IPADAPTER_PARAMS")
        node_map[final_ip_params[0]]["outputs"][final_ip_params[1]]["links"].append(l_ipp)
        from_params_node["inputs"][1]["link"] = l_ipp

        l_ipm = add_link(ip_model_id, 0, from_params_id, 2, "IPADAPTER")
        node_map[ip_model_id]["outputs"][0]["links"].append(l_ipm)
        from_params_node["inputs"][2]["link"] = l_ipm

        l_cv = add_link(clip_vision_id, 0, from_params_id, 3, "CLIP_VISION")
        node_map[clip_vision_id]["outputs"][0]["links"].append(l_cv)
        from_params_node["inputs"][3]["link"] = l_cv

        active_sdxl_model_source = (from_params_id, 0)

    # Conditioning Combiner Helper
    def build_combine_tree(cond_list, start_x, start_y, label_prefix):
        if not cond_list:
            return None
        current_layer = list(cond_list)
        cur_x = start_x
        while len(current_layer) > 1:
            next_layer = []
            for i in range(0, len(current_layer), 2):
                if i + 1 < len(current_layer):
                    c1 = current_layer[i]
                    c2 = current_layer[i + 1]
                    comb_id = next_node_id()
                    comb_node = {
                        "id": comb_id,
                        "type": "ConditioningCombine",
                        "pos": [cur_x, start_y + (i * 90)],
                        "size": [240, 80],
                        "title": f"Combine {label_prefix} ({i}+{i+1})",
                        "inputs": [
                            {"name": "conditioning_1", "type": "CONDITIONING", "link": None},
                            {"name": "conditioning_2", "type": "CONDITIONING", "link": None}
                        ],
                        "outputs": [
                            {"name": "CONDITIONING", "type": "CONDITIONING", "links": [], "slot_index": 0}
                        ]
                    }
                    nodes.append(comb_node)
                    node_map[comb_id] = comb_node

                    l1 = add_link(c1[0], c1[1], comb_id, 0, "CONDITIONING")
                    node_map[c1[0]]["outputs"][c1[1]]["links"].append(l1)
                    comb_node["inputs"][0]["link"] = l1

                    l2 = add_link(c2[0], c2[1], comb_id, 1, "CONDITIONING")
                    node_map[c2[0]]["outputs"][c2[1]]["links"].append(l2)
                    comb_node["inputs"][1]["link"] = l2

                    next_layer.append((comb_id, 0))
                else:
                    next_layer.append(current_layer[i])
            current_layer = next_layer
            cur_x += 280
        return current_layer[0]

    final_regional_pos = build_combine_tree(piece_pos_conds, 2200, 100, "Pos")

    # Combine Regional Tree with Global Scene Lighting (Master v2 Architecture)
    comb_global_id = next_node_id()
    comb_global_node = {
        "id": comb_global_id,
        "type": "ConditioningCombine",
        "pos": [2800, 100],
        "size": [260, 80],
        "title": "Combine Regional + Global Scene Lighting",
        "inputs": [
            {"name": "conditioning_1", "type": "CONDITIONING", "link": None},
            {"name": "conditioning_2", "type": "CONDITIONING", "link": None}
        ],
        "outputs": [
            {"name": "CONDITIONING", "type": "CONDITIONING", "links": [], "slot_index": 0}
        ]
    }
    nodes.append(comb_global_node)
    node_map[comb_global_id] = comb_global_node

    l_r = add_link(final_regional_pos[0], final_regional_pos[1], comb_global_id, 0, "CONDITIONING")
    node_map[final_regional_pos[0]]["outputs"][final_regional_pos[1]]["links"].append(l_r)
    comb_global_node["inputs"][0]["link"] = l_r

    l_g = add_link(sdxl_scene_pos_id, 0, comb_global_id, 1, "CONDITIONING")
    sdxl_scene_pos_node["outputs"][0]["links"].append(l_g)
    comb_global_node["inputs"][1]["link"] = l_g

    final_pos_cond = (comb_global_id, 0)

    all_neg_conds = piece_neg_conds if piece_neg_conds else [(sdxl_scene_neg_id, 0)]
    final_neg_cond = build_combine_tree(all_neg_conds, 2200, 700, "Neg")

    # Depth ControlNet
    depth_cn_id = next_node_id()
    nodes.append({
        "id": depth_cn_id,
        "type": "ControlNetLoader",
        "pos": [3100, 100],
        "size": [320, 90],
        "title": "Depth ControlNet Loader",
        "widgets_values": ["controlnet-depth-sdxl-1.0.safetensors"],
        "outputs": [{"name": "CONTROL_NET", "type": "CONTROL_NET", "links": [], "slot_index": 0}]
    })
    node_map[depth_cn_id] = nodes[-1]

    depth_img_id = next_node_id()
    nodes.append({
        "id": depth_img_id,
        "type": "LoadImage",
        "pos": [3100, 210],
        "size": [320, 240],
        "title": "3D Depth Guide (Depth.png)",
        "widgets_values": ["Depth.png", "image"],
        "outputs": [
            {"name": "IMAGE", "type": "IMAGE", "links": [], "slot_index": 0},
            {"name": "MASK", "type": "MASK", "links": [], "slot_index": 1}
        ]
    })
    node_map[depth_img_id] = nodes[-1]

    depth_apply_id = next_node_id()
    depth_apply_node = {
        "id": depth_apply_id,
        "type": "ControlNetApplyAdvanced",
        "pos": [3500, 100],
        "size": [320, 200],
        "title": "Apply 3D Depth ControlNet",
        "widgets_values": [depth_strength, depth_start, depth_end],
        "inputs": [
            {"name": "positive", "type": "CONDITIONING", "link": None},
            {"name": "negative", "type": "CONDITIONING", "link": None},
            {"name": "control_net", "type": "CONTROL_NET", "link": None},
            {"name": "image", "type": "IMAGE", "link": None}
        ],
        "outputs": [
            {"name": "positive", "type": "CONDITIONING", "links": [], "slot_index": 0},
            {"name": "negative", "type": "CONDITIONING", "links": [], "slot_index": 1}
        ]
    }
    nodes.append(depth_apply_node)
    node_map[depth_apply_id] = depth_apply_node

    l_dp_pos = add_link(final_pos_cond[0], final_pos_cond[1], depth_apply_id, 0, "CONDITIONING")
    node_map[final_pos_cond[0]]["outputs"][final_pos_cond[1]]["links"].append(l_dp_pos)
    depth_apply_node["inputs"][0]["link"] = l_dp_pos

    l_dp_neg = add_link(final_neg_cond[0], final_neg_cond[1], depth_apply_id, 1, "CONDITIONING")
    node_map[final_neg_cond[0]]["outputs"][final_neg_cond[1]]["links"].append(l_dp_neg)
    depth_apply_node["inputs"][1]["link"] = l_dp_neg

    l_dp_cn = add_link(depth_cn_id, 0, depth_apply_id, 2, "CONTROL_NET")
    node_map[depth_cn_id]["outputs"][0]["links"].append(l_dp_cn)
    depth_apply_node["inputs"][2]["link"] = l_dp_cn

    l_dp_img = add_link(depth_img_id, 0, depth_apply_id, 3, "IMAGE")
    node_map[depth_img_id]["outputs"][0]["links"].append(l_dp_img)
    depth_apply_node["inputs"][3]["link"] = l_dp_img

    # Normal ControlNet
    norm_cn_id = next_node_id()
    nodes.append({
        "id": norm_cn_id,
        "type": "ControlNetLoader",
        "pos": [3100, 480],
        "size": [320, 90],
        "title": "Normal ControlNet Loader",
        "widgets_values": ["controlnet-normal-sdxl-1.0.safetensors"],
        "outputs": [{"name": "CONTROL_NET", "type": "CONTROL_NET", "links": [], "slot_index": 0}]
    })
    node_map[norm_cn_id] = nodes[-1]

    norm_img_id = next_node_id()
    nodes.append({
        "id": norm_img_id,
        "type": "LoadImage",
        "pos": [3100, 590],
        "size": [320, 240],
        "title": "3D Normal Guide (Normal.png)",
        "widgets_values": ["Normal.png", "image"],
        "outputs": [
            {"name": "IMAGE", "type": "IMAGE", "links": [], "slot_index": 0},
            {"name": "MASK", "type": "MASK", "links": [], "slot_index": 1}
        ]
    })
    node_map[norm_img_id] = nodes[-1]

    norm_apply_id = next_node_id()
    norm_apply_node = {
        "id": norm_apply_id,
        "type": "ControlNetApplyAdvanced",
        "pos": [3500, 480],
        "size": [320, 200],
        "title": "Apply 3D Normal ControlNet",
        "widgets_values": [normal_strength, normal_start, normal_end],
        "inputs": [
            {"name": "positive", "type": "CONDITIONING", "link": None},
            {"name": "negative", "type": "CONDITIONING", "link": None},
            {"name": "control_net", "type": "CONTROL_NET", "link": None},
            {"name": "image", "type": "IMAGE", "link": None}
        ],
        "outputs": [
            {"name": "positive", "type": "CONDITIONING", "links": [], "slot_index": 0},
            {"name": "negative", "type": "CONDITIONING", "links": [], "slot_index": 1}
        ]
    }
    nodes.append(norm_apply_node)
    node_map[norm_apply_id] = norm_apply_node

    l_nm_pos = add_link(depth_apply_id, 0, norm_apply_id, 0, "CONDITIONING")
    depth_apply_node["outputs"][0]["links"].append(l_nm_pos)
    norm_apply_node["inputs"][0]["link"] = l_nm_pos

    l_nm_neg = add_link(depth_apply_id, 1, norm_apply_id, 1, "CONDITIONING")
    depth_apply_node["outputs"][1]["links"].append(l_nm_neg)
    norm_apply_node["inputs"][1]["link"] = l_nm_neg

    l_nm_cn = add_link(norm_cn_id, 0, norm_apply_id, 2, "CONTROL_NET")
    node_map[norm_cn_id]["outputs"][0]["links"].append(l_nm_cn)
    norm_apply_node["inputs"][2]["link"] = l_nm_cn

    l_nm_img = add_link(norm_img_id, 0, norm_apply_id, 3, "IMAGE")
    node_map[norm_img_id]["outputs"][0]["links"].append(l_nm_img)
    norm_apply_node["inputs"][3]["link"] = l_nm_img

    # Stage 1: SDXL KSampler
    sdxl_ks_id = next_node_id()
    sdxl_ks_node = {
        "id": sdxl_ks_id,
        "type": "KSampler",
        "pos": [3900, 300],
        "size": [330, 310],
        "title": "SDXL Stage 1 KSampler (Regional 3D Base)",
        "widgets_values": [123456789, "randomize", 28, sdxl_cfg, "dpmpp_2m", "karras", sdxl_denoise],
        "inputs": [
            {"name": "model", "type": "MODEL", "link": None},
            {"name": "positive", "type": "CONDITIONING", "link": None},
            {"name": "negative", "type": "CONDITIONING", "link": None},
            {"name": "latent_image", "type": "LATENT", "link": None}
        ],
        "outputs": [
            {"name": "LATENT", "type": "LATENT", "links": [], "slot_index": 0}
        ]
    }
    nodes.append(sdxl_ks_node)
    node_map[sdxl_ks_id] = sdxl_ks_node

    l_ks_mod = add_link(active_sdxl_model_source[0], active_sdxl_model_source[1], sdxl_ks_id, 0, "MODEL")
    node_map[active_sdxl_model_source[0]]["outputs"][active_sdxl_model_source[1]]["links"].append(l_ks_mod)
    sdxl_ks_node["inputs"][0]["link"] = l_ks_mod

    l_ks_pos = add_link(norm_apply_id, 0, sdxl_ks_id, 1, "CONDITIONING")
    norm_apply_node["outputs"][0]["links"].append(l_ks_pos)
    sdxl_ks_node["inputs"][1]["link"] = l_ks_pos

    l_ks_neg = add_link(norm_apply_id, 1, sdxl_ks_id, 2, "CONDITIONING")
    norm_apply_node["outputs"][1]["links"].append(l_ks_neg)
    sdxl_ks_node["inputs"][2]["link"] = l_ks_neg

    l_ks_lat = add_link(latent_id, 0, sdxl_ks_id, 3, "LATENT")
    latent_node["outputs"][0]["links"].append(l_ks_lat)
    sdxl_ks_node["inputs"][3]["link"] = l_ks_lat

    # SDXL VAE Decode & Save
    sdxl_decode_id = next_node_id()
    sdxl_decode_node = {
        "id": sdxl_decode_id,
        "type": "VAEDecode",
        "pos": [4300, 300],
        "size": [260, 110],
        "title": "SDXL VAE Decode",
        "inputs": [
            {"name": "samples", "type": "LATENT", "link": None},
            {"name": "vae", "type": "VAE", "link": None}
        ],
        "outputs": [
            {"name": "IMAGE", "type": "IMAGE", "links": [], "slot_index": 0}
        ]
    }
    nodes.append(sdxl_decode_node)
    node_map[sdxl_decode_id] = sdxl_decode_node

    l_dec_lat = add_link(sdxl_ks_id, 0, sdxl_decode_id, 0, "LATENT")
    sdxl_ks_node["outputs"][0]["links"].append(l_dec_lat)
    sdxl_decode_node["inputs"][0]["link"] = l_dec_lat

    l_dec_vae = add_link(sdxl_ckpt_id, 2, sdxl_decode_id, 1, "VAE")
    sdxl_ckpt_node["outputs"][2]["links"].append(l_dec_vae)
    sdxl_decode_node["inputs"][1]["link"] = l_dec_vae

    sdxl_save_id = next_node_id()
    sdxl_save_node = {
        "id": sdxl_save_id,
        "type": "SaveImage",
        "pos": [4600, 300],
        "size": [340, 320],
        "title": "Save SDXL Base Pass",
        "widgets_values": ["SDXL_Stage1_Base_Pass"],
        "inputs": [{"name": "images", "type": "IMAGE", "link": None}]
    }
    nodes.append(sdxl_save_node)
    node_map[sdxl_save_id] = sdxl_save_node

    l_save_sdxl = add_link(sdxl_decode_id, 0, sdxl_save_id, 0, "IMAGE")
    sdxl_decode_node["outputs"][0]["links"].append(l_save_sdxl)
    sdxl_save_node["inputs"][0]["link"] = l_save_sdxl

    # Stage 2: FLUX.1-dev CMF Refiner
    flux_unet_id = next_node_id()
    nodes.append({
        "id": flux_unet_id,
        "type": "UNETLoader",
        "pos": [5000, 100],
        "size": [320, 90],
        "title": "FLUX Diffusion Model (FP8)",
        "widgets_values": ["flux1-dev-fp8.safetensors", "fp8_e4m3fn"],
        "outputs": [{"name": "MODEL", "type": "MODEL", "links": [], "slot_index": 0}]
    })
    node_map[flux_unet_id] = nodes[-1]

    flux_clip_id = next_node_id()
    nodes.append({
        "id": flux_clip_id,
        "type": "DualCLIPLoader",
        "pos": [5000, 230],
        "size": [320, 100],
        "title": "FLUX Dual CLIP (T5XXL + CLIP-L)",
        "widgets_values": ["t5xxl_fp8_e4m3fn.safetensors", "clip_l.safetensors", "flux"],
        "outputs": [{"name": "CLIP", "type": "CLIP", "links": [], "slot_index": 0}]
    })
    node_map[flux_clip_id] = nodes[-1]

    flux_vae_id = next_node_id()
    nodes.append({
        "id": flux_vae_id,
        "type": "VAELoader",
        "pos": [5000, 370],
        "size": [320, 90],
        "title": "FLUX VAE Loader",
        "widgets_values": ["ae.safetensors"],
        "outputs": [{"name": "VAE", "type": "VAE", "links": [], "slot_index": 0}]
    })
    node_map[flux_vae_id] = nodes[-1]

    flux_lora_id = next_node_id()
    flux_lora_node = {
        "id": flux_lora_id,
        "type": "LoraLoader",
        "pos": [5380, 100],
        "size": [320, 130],
        "title": "Apple Minimal Craft FLUX LoRA",
        "widgets_values": ["apple_minimal_craft_flux_v1.safetensors", 0.95, 0.95],
        "inputs": [
            {"name": "model", "type": "MODEL", "link": None},
            {"name": "clip", "type": "CLIP", "link": None}
        ],
        "outputs": [
            {"name": "MODEL", "type": "MODEL", "links": [], "slot_index": 0},
            {"name": "CLIP", "type": "CLIP", "links": [], "slot_index": 1}
        ]
    }
    nodes.append(flux_lora_node)
    node_map[flux_lora_id] = flux_lora_node

    l_fx_mod = add_link(flux_unet_id, 0, flux_lora_id, 0, "MODEL")
    node_map[flux_unet_id]["outputs"][0]["links"].append(l_fx_mod)
    flux_lora_node["inputs"][0]["link"] = l_fx_mod

    l_fx_clip = add_link(flux_clip_id, 0, flux_lora_id, 1, "CLIP")
    node_map[flux_clip_id]["outputs"][0]["links"].append(l_fx_clip)
    flux_lora_node["inputs"][1]["link"] = l_fx_clip

    # FLUX Positive Prompt & Guidance
    flux_pos_id = next_node_id()
    flux_pos_node = {
        "id": flux_pos_id,
        "type": "CLIPTextEncode",
        "pos": [5760, 100],
        "size": [400, 190],
        "title": "FLUX Stage 2 Master Prompt",
        "widgets_values": [flux_pos],
        "inputs": [{"name": "clip", "type": "CLIP", "link": None}],
        "outputs": [{"name": "CONDITIONING", "type": "CONDITIONING", "links": [], "slot_index": 0}]
    }
    nodes.append(flux_pos_node)
    node_map[flux_pos_id] = flux_pos_node

    l_fl_pos_clip = add_link(flux_lora_id, 1, flux_pos_id, 0, "CLIP")
    flux_lora_node["outputs"][1]["links"].append(l_fl_pos_clip)
    flux_pos_node["inputs"][0]["link"] = l_fl_pos_clip

    flux_guide_id = next_node_id()
    flux_guide_node = {
        "id": flux_guide_id,
        "type": "FluxGuidance",
        "pos": [6200, 100],
        "size": [220, 90],
        "title": "Flux Guidance",
        "widgets_values": [3.5],
        "inputs": [{"name": "conditioning", "type": "CONDITIONING", "link": None}],
        "outputs": [{"name": "conditioning", "type": "CONDITIONING", "links": [], "slot_index": 0}]
    }
    nodes.append(flux_guide_node)
    node_map[flux_guide_id] = flux_guide_node

    l_fl_guid = add_link(flux_pos_id, 0, flux_guide_id, 0, "CONDITIONING")
    flux_pos_node["outputs"][0]["links"].append(l_fl_guid)
    flux_guide_node["inputs"][0]["link"] = l_fl_guid

    # FLUX Negative Prompt
    flux_neg_id = next_node_id()
    flux_neg_node = {
        "id": flux_neg_id,
        "type": "CLIPTextEncode",
        "pos": [5760, 330],
        "size": [400, 150],
        "title": "FLUX Negative Prompt",
        "widgets_values": [global_neg],
        "inputs": [{"name": "clip", "type": "CLIP", "link": None}],
        "outputs": [{"name": "CONDITIONING", "type": "CONDITIONING", "links": [], "slot_index": 0}]
    }
    nodes.append(flux_neg_node)
    node_map[flux_neg_id] = flux_neg_node

    l_fl_neg_clip = add_link(flux_lora_id, 1, flux_neg_id, 0, "CLIP")
    flux_lora_node["outputs"][1]["links"].append(l_fl_neg_clip)
    flux_neg_node["inputs"][0]["link"] = l_fl_neg_clip

    # FLUX VAE Encode
    flux_enc_id = next_node_id()
    flux_enc_node = {
        "id": flux_enc_id,
        "type": "VAEEncode",
        "pos": [5760, 520],
        "size": [300, 110],
        "title": "FLUX VAE Encode (SDXL Output)",
        "inputs": [
            {"name": "pixels", "type": "IMAGE", "link": None},
            {"name": "vae", "type": "VAE", "link": None}
        ],
        "outputs": [{"name": "LATENT", "type": "LATENT", "links": [], "slot_index": 0}]
    }
    nodes.append(flux_enc_node)
    node_map[flux_enc_id] = flux_enc_node

    l_enc_img = add_link(sdxl_decode_id, 0, flux_enc_id, 0, "IMAGE")
    sdxl_decode_node["outputs"][0]["links"].append(l_enc_img)
    flux_enc_node["inputs"][0]["link"] = l_enc_img

    l_enc_vae = add_link(flux_vae_id, 0, flux_enc_id, 1, "VAE")
    node_map[flux_vae_id]["outputs"][0]["links"].append(l_enc_vae)
    flux_enc_node["inputs"][1]["link"] = l_enc_vae

    # FLUX Stage 2 KSampler
    flux_ks_id = next_node_id()
    flux_ks_node = {
        "id": flux_ks_id,
        "type": "KSampler",
        "pos": [6480, 200],
        "size": [330, 310],
        "title": "FLUX Stage 2 KSampler (CMF Refiner)",
        "widgets_values": [987654321, "randomize", 20, flux_cfg, "euler", "simple", flux_denoise],
        "inputs": [
            {"name": "model", "type": "MODEL", "link": None},
            {"name": "positive", "type": "CONDITIONING", "link": None},
            {"name": "negative", "type": "CONDITIONING", "link": None},
            {"name": "latent_image", "type": "LATENT", "link": None}
        ],
        "outputs": [{"name": "LATENT", "type": "LATENT", "links": [], "slot_index": 0}]
    }
    nodes.append(flux_ks_node)
    node_map[flux_ks_id] = flux_ks_node

    l_flks_mod = add_link(flux_lora_id, 0, flux_ks_id, 0, "MODEL")
    flux_lora_node["outputs"][0]["links"].append(l_flks_mod)
    flux_ks_node["inputs"][0]["link"] = l_flks_mod

    l_flks_pos = add_link(flux_guide_id, 0, flux_ks_id, 1, "CONDITIONING")
    flux_guide_node["outputs"][0]["links"].append(l_flks_pos)
    flux_ks_node["inputs"][1]["link"] = l_flks_pos

    l_flks_neg = add_link(flux_neg_id, 0, flux_ks_id, 2, "CONDITIONING")
    flux_neg_node["outputs"][0]["links"].append(l_flks_neg)
    flux_ks_node["inputs"][2]["link"] = l_flks_neg

    l_flks_lat = add_link(flux_enc_id, 0, flux_ks_id, 3, "LATENT")
    flux_enc_node["outputs"][0]["links"].append(l_flks_lat)
    flux_ks_node["inputs"][3]["link"] = l_flks_lat

    # FLUX VAE Decode
    flux_dec_id = next_node_id()
    flux_dec_node = {
        "id": flux_dec_id,
        "type": "VAEDecode",
        "pos": [6850, 200],
        "size": [260, 110],
        "title": "FLUX VAE Decode",
        "inputs": [
            {"name": "samples", "type": "LATENT", "link": None},
            {"name": "vae", "type": "VAE", "link": None}
        ],
        "outputs": [{"name": "IMAGE", "type": "IMAGE", "links": [], "slot_index": 0}]
    }
    nodes.append(flux_dec_node)
    node_map[flux_dec_id] = flux_dec_node

    l_fl_declat = add_link(flux_ks_id, 0, flux_dec_id, 0, "LATENT")
    flux_ks_node["outputs"][0]["links"].append(l_fl_declat)
    flux_dec_node["inputs"][0]["link"] = l_fl_declat

    l_fl_decvae = add_link(flux_vae_id, 0, flux_dec_id, 1, "VAE")
    node_map[flux_vae_id]["outputs"][0]["links"].append(l_fl_decvae)
    flux_dec_node["inputs"][1]["link"] = l_fl_decvae

    # Final Save Image Node
    final_save_id = next_node_id()
    final_save_node = {
        "id": final_save_id,
        "type": "SaveImage",
        "pos": [7150, 200],
        "size": [380, 380],
        "title": "Save Final Master LookDev Image",
        "widgets_values": ["Apple_Spatial_Dynamic_Hybrid_LookDev"],
        "inputs": [{"name": "images", "type": "IMAGE", "link": None}]
    }
    nodes.append(final_save_node)
    node_map[final_save_id] = final_save_node

    l_finsave = add_link(flux_dec_id, 0, final_save_id, 0, "IMAGE")
    flux_dec_node["outputs"][0]["links"].append(l_finsave)
    final_save_node["inputs"][0]["link"] = l_finsave

    return {
        "last_node_id": node_id_counter,
        "last_link_id": link_id_counter,
        "nodes": nodes,
        "links": links,
        "groups": [],
        "config": {},
        "extra": {"ds": {"scale": 0.8, "offset": [100, 100]}},
        "version": 0.4
    }

class PromptCompositorHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, request, client_address, server):
        super().__init__(request, client_address, server, directory=str(WEB_DIR))

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def _send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        # Serve local 3D guide passes
        if path.startswith("/guides/"):
            rel_guide_path = path[len("/guides/"):].lstrip("/")
            local_guide_file = GUIDES_DIR / rel_guide_path
            if local_guide_file.exists() and local_guide_file.is_file():
                content_type = "image/png"
                if local_guide_file.suffix == ".webp":
                    content_type = "image/webp"
                elif local_guide_file.suffix in (".jpg", ".jpeg"):
                    content_type = "image/jpeg"
                with open(local_guide_file, "rb") as f:
                    data = f.read()
                self.send_response(200)
                self.send_header("Content-Type", content_type)
                self.send_header("Content-Length", str(len(data)))
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(data)
                return
            else:
                self.send_error(404, f"Guide file not found: {rel_guide_path}")
                return

        # API: List or get presets
        if path == "/api/presets":
            preset_id = query.get("id", [None])[0]
            if preset_id:
                safe_id = "".join(c for c in preset_id if c.isalnum() or c in "_-")
                file_path = PRESETS_DIR / f"{safe_id}.json"
                if file_path.exists():
                    try:
                        with open(file_path, "r", encoding="utf-8-sig") as f:
                            data = json.load(f)
                        self._send_json({"success": True, "preset": data})
                    except Exception as e:
                        self._send_json({"success": False, "error": str(e)}, status=500)
                else:
                    self._send_json({"success": False, "error": "Preset not found"}, status=404)
                return

            # List summary of all presets
            presets_summary = []
            if PRESETS_DIR.exists():
                for p_file in sorted(PRESETS_DIR.glob("*.json")):
                    try:
                        with open(p_file, "r", encoding="utf-8-sig") as f:
                            p_data = json.load(f)
                        bg_c = p_data.get("globalState", {}).get("bgColor", "#f4f2ee")
                        swatch_colors = [s.get("color", "#cccccc") for s in p_data.get("activeSwatches", [])]
                        p_id = p_data.get("id") or p_file.stem
                        presets_summary.append({
                            "id": p_id,
                            "name": p_data.get("name", p_file.stem.replace("_", " ").title()),
                            "description": p_data.get("description", ""),
                            "bgColor": bg_c,
                            "swatchColors": swatch_colors,
                            "timestamp": p_data.get("timestamp", 0)
                        })
                    except Exception as e:
                        print(f"[!] Error loading preset {p_file.name}: {e}")
            self._send_json({"success": True, "presets": presets_summary})
            return

        # API: Get Workflow JSON (Live Synthesized Workflow)
        if path == "/api/workflow_json":
            wf_name = query.get("name", ["apple_spatial_hybrid_sdxl_flux_ipadapter_master_v3.json"])[0]
            wf_path = WORKFLOWS_DIR / wf_name
            if wf_path.exists():
                try:
                    with open(wf_path, "r", encoding="utf-8-sig") as f:
                        wf_data = json.load(f)
                    self._send_json({"success": True, "workflow": wf_data, "filename": wf_name})
                except Exception as e:
                    self._send_json({"success": False, "error": str(e)}, status=500)
            else:
                # Generate dynamic fallback
                fallback_wf = generate_dynamic_workflow({"shot": "0085"})
                self._send_json({"success": True, "workflow": fallback_wf, "filename": wf_name})
            return

        # API: List shots
        if path == "/api/shots":
            shots = []
            if GUIDES_DIR.exists():
                for shot_dir in sorted(GUIDES_DIR.iterdir()):
                    if shot_dir.is_dir() and shot_dir.name.isdigit():
                        passes = [f.name for f in shot_dir.glob("*.png")]
                        shots.append({
                            "shot": shot_dir.name,
                            "passes": passes,
                            "has_normal": "Normal.png" in passes,
                            "has_depth": "Depth.png" in passes,
                            "has_mask_00": "Mask_00.png" in passes
                        })
            self._send_json({"success": True, "shots": shots})
            return

        return super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        content_len = int(self.headers.get("Content-Length", 0))
        post_body = self.rfile.read(content_len) if content_len > 0 else b"{}"

        try:
            payload = json.loads(post_body.decode("utf-8")) if post_body else {}
        except Exception:
            payload = {}

        # API: Upload Reference Image
        if path == "/api/upload_image":
            data_url = payload.get("data_url", "")
            orig_filename = payload.get("filename", "")
            slot = payload.get("slot", "P0")

            if not data_url or not data_url.startswith("data:image/"):
                self._send_json({"success": False, "error": "Invalid image data URL"}, status=400)
                return

            header, b64data = data_url.split(",", 1)
            file_bytes = base64.b64decode(b64data)

            content_type = "image/png"
            ext = ".png"
            if "image/jpeg" in header or "image/jpg" in header:
                content_type = "image/jpeg"
                ext = ".jpg"
            elif "image/webp" in header:
                content_type = "image/webp"
                ext = ".webp"

            clean_name = "".join(c for c in Path(orig_filename).stem if c.isalnum() or c in "_-")
            if clean_name:
                final_filename = f"ref_{slot}_{clean_name}{ext}"
            else:
                final_filename = f"ref_{slot}_{int(time.time())}{ext}"

            res = upload_ref_image(file_bytes, final_filename, content_type)
            self._send_json(res)
            return

        # API: Update Target Settings
        if path == "/api/settings":
            global COMFYUI_INPUT_DIR
            custom_input = payload.get("comfy_input_dir")
            if custom_input:
                COMFYUI_INPUT_DIR = Path(custom_input)
            self._send_json({"success": True, "comfy_input_dir": str(COMFYUI_INPUT_DIR)})
            return

        # API: Create New Shot Directory
        if path == "/api/create_shot":
            shot_num = str(payload.get("shot", "")).strip().zfill(4)
            clone_from = payload.get("clone_from", "")
            if not shot_num or not shot_num.isdigit():
                self._send_json({"success": False, "error": "Invalid shot number"}, status=400)
                return

            new_dir = GUIDES_DIR / shot_num
            new_dir.mkdir(parents=True, exist_ok=True)

            if clone_from and (GUIDES_DIR / str(clone_from).zfill(4)).exists():
                src_dir = GUIDES_DIR / str(clone_from).zfill(4)
                for f in src_dir.glob("*.png"):
                    shutil.copy2(f, new_dir / f.name)

            self._send_json({"success": True, "shot": shot_num, "created": str(new_dir)})
            return

        # API: Inject Prompts into Workflow JSON & Save / Return (Pure Dynamic Synthesis)
        if path == "/api/inject_workflow":
            out_wf_name = payload.get("output_workflow", f"apple_spatial_hybrid_sdxl_flux_ipadapter_master_v3.json")
            shot_str = str(payload.get("shot", "0085")).strip().zfill(4)

            try:
                # Auto-deploy 3D passes to ComfyUI input folder
                deployed_files = deploy_shot_assets(shot_str)

                # Auto decode and deploy WebP reference images (P0 + P1~P6) to ComfyUI input folder
                p0_data_url = payload.get("p0_image_src") or (payload.get("background", {}).get("image_src") if isinstance(payload.get("background"), dict) else payload.get("background", {}).get("imageSrc"))
                save_data_url_image(p0_data_url, "ref_p0_floor.webp", fallback_color=(220, 220, 220))

                regional = payload.get("regional", {})
                for p_idx in range(1, 7):
                    p_key = f"Part_{str(p_idx).zfill(2)}"
                    p_val = {}
                    if isinstance(regional, list) and (p_idx - 1) < len(regional):
                        p_val = regional[p_idx - 1]
                    elif isinstance(regional, dict):
                        p_val = regional.get(p_key) or regional.get(f"Part_{p_idx}") or regional.get(f"Part {p_idx}") or {}
                    
                    img_src = (p_val.get("image_src") or p_val.get("imageSrc")) if isinstance(p_val, dict) else None
                    save_data_url_image(img_src, f"ref_p{p_idx}.webp", fallback_color=(180, 180, 180))

                # Pure Dynamic Synthesis
                wf_data = generate_dynamic_workflow(payload)

                out_path = WORKFLOWS_DIR / out_wf_name
                with open(out_path, "w", encoding="utf-8") as f:
                    json.dump(wf_data, f, indent=2, ensure_ascii=False)

                self._send_json({
                    "success": True,
                    "workflow_name": out_wf_name,
                    "saved_path": str(out_path),
                    "workflow_json": wf_data,
                    "deployed_shot": shot_str,
                    "deployed_files": deployed_files
                })
                return
            except Exception as e:
                self._send_json({"success": False, "error": str(e)}, status=500)
                return

        # API: Sync/Save Reference Images directly to ComfyUI input folder
        if path == "/api/sync_ref_images":
            try:
                p0_src = payload.get("p0_image_src")
                if p0_src:
                    save_data_url_image(p0_src, "ref_p0_floor.webp", fallback_color=(220, 220, 220))
                swatches = payload.get("swatches", [])
                for idx, s in enumerate(swatches):
                    p_idx = idx + 1
                    s_src = s.get("imageSrc") or s.get("image_src")
                    if s_src:
                        save_data_url_image(s_src, f"ref_p{p_idx}.webp", fallback_color=(180, 180, 180))
                self._send_json({"success": True, "message": "Reference images synced to ComfyUI input"})
            except Exception as e:
                self._send_json({"success": False, "error": str(e)}, status=500)
            return

        # API: Deploy Shot to ComfyUI Input (Manual Trigger)
        if path == "/api/deploy_shot":
            shot_str = query.get("shot", [str(payload.get("shot", "0085"))])[0].zfill(4)
            try:
                copied_files = deploy_shot_assets(shot_str)
                self._send_json({
                    "success": True,
                    "shot": shot_str,
                    "copied_files": copied_files
                })
            except Exception as e:
                self._send_json({"success": False, "error": str(e)}, status=500)
            return

        # API: Save Preset JSON
        if path == "/api/presets":
            name = payload.get("name", "").strip()
            if not name:
                self._send_json({"success": False, "error": "Preset name is required"}, status=400)
                return

            raw_id = payload.get("id") or name.lower().replace(" ", "_")
            safe_id = "".join(c for c in raw_id if c.isalnum() or c in "_-")
            if not safe_id:
                safe_id = f"preset_{int(time.time())}"

            payload["id"] = safe_id
            payload["timestamp"] = int(time.time())
            file_path = PRESETS_DIR / f"{safe_id}.json"
            try:
                with open(file_path, "w", encoding="utf-8") as f:
                    json.dump(payload, f, indent=2, ensure_ascii=False)
                self._send_json({"success": True, "id": safe_id, "path": str(file_path)})
            except Exception as e:
                self._send_json({"success": False, "error": str(e)}, status=500)
            return

        # API: Delete Preset
        if path == "/api/presets/delete":
            preset_id = payload.get("id") or query.get("id", [None])[0]
            if not preset_id:
                self._send_json({"success": False, "error": "Preset id is required"}, status=400)
                return

            safe_id = "".join(c for c in preset_id if c.isalnum() or c in "_-")
            file_path = PRESETS_DIR / f"{safe_id}.json"
            if file_path.exists():
                try:
                    file_path.unlink()
                    self._send_json({"success": True, "deleted": safe_id})
                except Exception as e:
                    self._send_json({"success": False, "error": str(e)}, status=500)
            else:
                self._send_json({"success": False, "error": "Preset not found"}, status=404)
            return

        # API: Gemini VLM Auto-Synthesize LookDev Prompts
        if path == "/api/vlm_synthesize":
            try:
                gemini_api_key = payload.get("apiKey") or os.environ.get("GEMINI_API_KEY", "")
                shot_num = int(payload.get("shot", 2))
                shot_str = str(shot_num).zfill(4)
                swatches = payload.get("swatches", [])
                tabletop = payload.get("tabletop", "clean matte studio tabletop surface")
                lighting = payload.get("lighting", "directional key light from top-right (1 o'clock direction) at a shallow 30-degree grazing angle")
                style_prefix = payload.get("stylePrefix", "a photo in apple minimal craft style of, minimalist commercial studio photography, top-down flat lay view, professional luxury skincare cosmetic swatches")
                
                # Collect 3D guide passes with user-defined labels
                guide_slots = payload.get("guideSlots") or [
                    {"file": "Color.png", "label": "Albedo Color ID Pass (Swatches & Tabletop Placement)"},
                    {"file": "Normal.png", "label": "Tangent Normal Map (Surface Angles & Meniscus Curvature)"},
                    {"file": "Depth.png", "label": "3D Linear Depth Map (Volume & Spatial Depth)"}
                ]

                gemini_contents = []
                guide_dir = REPO_ROOT / "3d_guides" / shot_str
                if not guide_dir.exists():
                    guide_dir = HOUDINI_DATA_DIR / shot_str

                # Add each labeled guide image to the Gemini prompt payload (Optimized for ultra-fast VLM analysis)
                for idx, slot in enumerate(guide_slots):
                    g_filename = slot.get("file", f"guide_{idx+1}.png")
                    g_label = slot.get("label", f"3D Pass {idx+1}")
                    g_file = guide_dir / g_filename
                    if g_file.exists():
                        try:
                            # Optimize to fast lightweight JPEG (512x512) for instant VLM vision reasoning
                            with Image.open(g_file) as img:
                                rgb_img = img.convert("RGB")
                                rgb_img.thumbnail((512, 512), Image.Resampling.LANCZOS)
                                buf = io.BytesIO()
                                rgb_img.save(buf, format="JPEG", quality=85)
                                g_b64 = base64.b64encode(buf.getvalue()).decode("utf-8")

                            gemini_contents.append({"text": f"--- GUIDE PASS {idx+1} [Role: {g_label} ({g_filename})] ---"})
                            gemini_contents.append({
                                "inline_data": {
                                    "mime_type": "image/jpeg",
                                    "data": g_b64
                                }
                            })
                        except Exception as ge:
                            print(f"[VLM] Error reading/compressing {g_file}: {ge}")

                prompt_instruction = f"""You are the Lead Apple Spatial LookDev CGI Supervisor.
Analyze each attached 3D guide pass according to its specific labeled role above (e.g. Color, Normal, Depth, etc.).

CRITICAL PHYSICAL RULES:
1. ANTI-PETAL RULE: The swatches are NOT flower petals, leaves, paper, or clay. They are thick, high-viscosity cosmetic liquid gels, glossy lip glosses, or dense balms with high surface tension.
2. OPTICAL PHYSICS: Explicitly describe luminous internal caustics, convex meniscus domes, wet glass-like reflection, and optical light transmission.
3. TABLETOP & CONTACT: {tabletop}. Describe soft contact ambient occlusion shadows anchoring the swatches.
4. LIGHTING: {lighting}.

USER CMF CONTEXT:
Style: {style_prefix}
Part Count: {len(swatches)} parts.

Return a valid JSON object ONLY with the following schema:
{{
  "masterPrompt": "The full complete FLUX.1-dev master prompt string (around 80-120 words)",
  "substanceSummary": "Short 1-sentence physical summary of the materials",
  "negativePrompt": "petals, flower, leaf, plant, botanical, fibrous grain, radial venation, dry paper, thin shell, wood texture, blur, distortion"
}}"""

                gemini_contents.insert(0, {"text": prompt_instruction})
                gemini_payload = {
                    "contents": [{"parts": gemini_contents}],
                    "generationConfig": {
                        "response_mime_type": "application/json",
                        "temperature": 0.2
                    }
                }

                gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key={gemini_api_key}"
                req = urllib.request.Request(
                    gemini_url,
                    data=json.dumps(gemini_payload).encode("utf-8"),
                    headers={"Content-Type": "application/json"}
                )

                with urllib.request.urlopen(req, timeout=45) as resp:
                    resp_data = json.loads(resp.read().decode("utf-8"))
                    raw_text = resp_data["candidates"][0]["content"]["parts"][0]["text"]
                    result_json = json.loads(raw_text)

                self._send_json({
                    "success": True,
                    "masterPrompt": result_json.get("masterPrompt", ""),
                    "substanceSummary": result_json.get("substanceSummary", ""),
                    "negativePrompt": result_json.get("negativePrompt", "")
                })
                return
            except Exception as e:
                import traceback
                traceback.print_exc()
                self._send_json({"success": False, "error": str(e)}, status=500)
                return

        self._send_json({"error": "Endpoint not found"}, status=404)

class ThreadingHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True

def main():
    import argparse
    parser = argparse.ArgumentParser(description="Spatial LookDev Prompt Compositor Web Server")
    parser.add_argument("--port", type=int, default=PORT, help=f"Server port (default: {PORT})")
    parser.add_argument("--host", type=str, default="0.0.0.0", help="Host binding (default: 0.0.0.0)")
    parser.add_argument("--no-browser", action="store_true", help="Do not open browser on launch")
    args = parser.parse_args()

    port = args.port
    server_address = (args.host, port)
    httpd = ThreadingHTTPServer(server_address, PromptCompositorHandler)

    print(f"================================================================")
    print(f"  [+] Spatial LookDev Dynamic Synthesizer Studio Backend")
    print(f"  [*] Local URL:  http://localhost:{port}")
    print(f"  [*] Network:    http://127.0.0.1:{port}")
    print(f"  [*] Guides Dir: {GUIDES_DIR}")
    print(f"  [*] ComfyUI In: {COMFYUI_INPUT_DIR}")
    print(f"  [*] Dynamic Pure Synthesis: Active (Zero Master File Dependency)")
    print(f"================================================================")

    if not args.no_browser:
        webbrowser.open(f"http://localhost:{port}")

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[!] Server shutting down...")
        httpd.server_close()

if __name__ == "__main__":
    main()
