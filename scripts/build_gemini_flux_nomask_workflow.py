import json
from pathlib import Path

nodes = []
links = []
node_id = 1
link_id = 1

def next_node():
    global node_id
    nid = node_id
    node_id += 1
    return nid

def add_link(src_node, src_slot, dst_node, dst_slot, type_name):
    global link_id
    lid = link_id
    link_id += 1
    links.append([lid, src_node, src_slot, dst_node, dst_slot, type_name])
    return lid

# 1. 3D Guide: Color.png (Node 1)
color_id = next_node()
color_node = {
    "id": color_id,
    "type": "LoadImage",
    "pos": [100, 100],
    "size": [280, 260],
    "title": "3D Guide: Color Pass",
    "widgets_values": ["0002/Color.png", "image"],
    "outputs": [{"name": "IMAGE", "type": "IMAGE", "links": [], "slot_index": 0}, {"name": "MASK", "type": "MASK", "links": [], "slot_index": 1}]
}
nodes.append(color_node)

# 2. 3D Guide: Normal.png (Node 2)
normal_id = next_node()
normal_node = {
    "id": normal_id,
    "type": "LoadImage",
    "pos": [100, 390],
    "size": [280, 260],
    "title": "3D Guide: Normal Pass",
    "widgets_values": ["0002/Normal.png", "image"],
    "outputs": [{"name": "IMAGE", "type": "IMAGE", "links": [], "slot_index": 0}, {"name": "MASK", "type": "MASK", "links": [], "slot_index": 1}]
}
nodes.append(normal_node)

# 3. 3D Guide: Depth.png (Node 3)
depth_id = next_node()
depth_node = {
    "id": depth_id,
    "type": "LoadImage",
    "pos": [100, 680],
    "size": [280, 260],
    "title": "3D Guide: Depth Pass",
    "widgets_values": ["0002/Depth.png", "image"],
    "outputs": [{"name": "IMAGE", "type": "IMAGE", "links": [], "slot_index": 0}, {"name": "MASK", "type": "MASK", "links": [], "slot_index": 1}]
}
nodes.append(depth_node)

# 4. Gemini 3.5 LookDev VLM Node (Node 4)
vlm_id = next_node()
vlm_node = {
    "id": vlm_id,
    "type": "GeminiLookDevVLMNode",
    "pos": [450, 240],
    "size": [440, 480],
    "title": "💎 Gemini 3.5 LookDev VLM Analyzer",
    "inputs": [
        {"name": "color_guide", "type": "IMAGE", "link": None},
        {"name": "normal_guide", "type": "IMAGE", "link": None},
        {"name": "depth_guide", "type": "IMAGE", "link": None}
    ],
    "widgets_values": [
        os.getenv("GEMINI_API_KEY", ""),
        "a photo in apple minimal craft style of, minimalist commercial studio photography, top-down flat lay view, professional luxury skincare cosmetic swatches",
        "clean matte studio tabletop surface with soft contact ambient occlusion shadows",
        "directional key light from top-right (1 o'clock) at a shallow 30-degree grazing angle",
        "CRITICAL: Swatches are thick, high-viscosity cosmetic liquid gels with high surface tension and internal caustics. NOT flower petals, leaves, or paper."
    ],
    "outputs": [
        {"name": "flux_master_prompt", "type": "STRING", "links": [], "slot_index": 0},
        {"name": "negative_prompt", "type": "STRING", "links": [], "slot_index": 1}
    ]
}
nodes.append(vlm_node)

# Wire 3D Guides into Gemini Node
l_c = add_link(color_id, 0, vlm_id, 0, "IMAGE")
color_node["outputs"][0]["links"].append(l_c)
vlm_node["inputs"][0]["link"] = l_c

l_n = add_link(normal_id, 0, vlm_id, 1, "IMAGE")
normal_node["outputs"][0]["links"].append(l_n)
vlm_node["inputs"][1]["link"] = l_n

l_d = add_link(depth_id, 0, vlm_id, 2, "IMAGE")
depth_node["outputs"][0]["links"].append(l_d)
vlm_node["inputs"][2]["link"] = l_d

# 5. UNET Loader (Node 5)
unet_id = next_node()
unet_node = {
    "id": unet_id,
    "type": "UNETLoader",
    "pos": [940, 100],
    "size": [320, 100],
    "title": "FLUX UNET (flux1-dev-fp8.safetensors)",
    "widgets_values": ["flux1-dev-fp8.safetensors", "fp8_e4m3fn"],
    "outputs": [{"name": "MODEL", "type": "MODEL", "links": [], "slot_index": 0}]
}
nodes.append(unet_node)

# 6. Apple Minimal Craft FLUX LoRA (Node 6)
lora_id = next_node()
lora_node = {
    "id": lora_id,
    "type": "LoraLoaderModelOnly",
    "pos": [1300, 100],
    "size": [320, 100],
    "title": "Apple Minimal Craft FLUX LoRA (0.55)",
    "widgets_values": ["apple_minimal_craft_flux_v1.safetensors", 0.55],
    "inputs": [{"name": "model", "type": "MODEL", "link": None}],
    "outputs": [{"name": "MODEL", "type": "MODEL", "links": [], "slot_index": 0}]
}
nodes.append(lora_node)

l_ul = add_link(unet_id, 0, lora_id, 0, "MODEL")
unet_node["outputs"][0]["links"].append(l_ul)
lora_node["inputs"][0]["link"] = l_ul

# 7. DualCLIPLoader (Node 7)
clip_id = next_node()
clip_node = {
    "id": clip_id,
    "type": "DualCLIPLoader",
    "pos": [940, 240],
    "size": [320, 120],
    "title": "FLUX Dual CLIP (T5XXL + CLIP-L)",
    "widgets_values": ["t5xxl_fp8_e4m3fn.safetensors", "clip_l.safetensors", "flux"],
    "outputs": [{"name": "CLIP", "type": "CLIP", "links": [], "slot_index": 0}]
}
nodes.append(clip_node)

# 8. CLIPTextEncode (Positive Prompt from Gemini VLM) (Node 8)
pos_clip_id = next_node()
pos_clip_node = {
    "id": pos_clip_id,
    "type": "CLIPTextEncode",
    "pos": [1300, 240],
    "size": [400, 200],
    "title": "FLUX Positive (Auto-Wired from Gemini VLM)",
    "inputs": [
        {"name": "clip", "type": "CLIP", "link": None},
        {"name": "text", "type": "STRING", "link": None}
    ],
    "widgets_values": [""],
    "outputs": [{"name": "CONDITIONING", "type": "CONDITIONING", "links": [], "slot_index": 0}]
}
nodes.append(pos_clip_node)

l_cp = add_link(clip_id, 0, pos_clip_id, 0, "CLIP")
clip_node["outputs"][0]["links"].append(l_cp)
pos_clip_node["inputs"][0]["link"] = l_cp

l_vlm_pos = add_link(vlm_id, 0, pos_clip_id, 1, "STRING")
vlm_node["outputs"][0]["links"].append(l_vlm_pos)
pos_clip_node["inputs"][1]["link"] = l_vlm_pos

# 9. CLIPTextEncode (Negative Prompt from Gemini VLM) (Node 9)
neg_clip_id = next_node()
neg_clip_node = {
    "id": neg_clip_id,
    "type": "CLIPTextEncode",
    "pos": [1300, 480],
    "size": [400, 150],
    "title": "FLUX Negative (Auto-Wired from Gemini VLM)",
    "inputs": [
        {"name": "clip", "type": "CLIP", "link": None},
        {"name": "text", "type": "STRING", "link": None}
    ],
    "widgets_values": [""],
    "outputs": [{"name": "CONDITIONING", "type": "CONDITIONING", "links": [], "slot_index": 0}]
}
nodes.append(neg_clip_node)

l_cn = add_link(clip_id, 0, neg_clip_id, 0, "CLIP")
clip_node["outputs"][0]["links"].append(l_cn)
neg_clip_node["inputs"][0]["link"] = l_cn

l_vlm_neg = add_link(vlm_id, 1, neg_clip_id, 1, "STRING")
vlm_node["outputs"][1]["links"].append(l_vlm_neg)
neg_clip_node["inputs"][1]["link"] = l_vlm_neg

# 10. FluxGuidance (2.8) (Node 10)
guide_id = next_node()
guide_node = {
    "id": guide_id,
    "type": "FluxGuidance",
    "pos": [1740, 240],
    "size": [220, 80],
    "title": "FLUX Guidance (2.8)",
    "widgets_values": [2.8],
    "inputs": [{"name": "conditioning", "type": "CONDITIONING", "link": None}],
    "outputs": [{"name": "CONDITIONING", "type": "CONDITIONING", "links": [], "slot_index": 0}]
}
nodes.append(guide_node)

l_pg = add_link(pos_clip_id, 0, guide_id, 0, "CONDITIONING")
pos_clip_node["outputs"][0]["links"].append(l_pg)
guide_node["inputs"][0]["link"] = l_pg

# 11. EmptyLatentImage (Node 11)
latent_id = next_node()
latent_node = {
    "id": latent_id,
    "type": "EmptyLatentImage",
    "pos": [1740, 360],
    "size": [220, 110],
    "title": "Empty Latent (1024x1024)",
    "widgets_values": [1024, 1024, 1],
    "outputs": [{"name": "LATENT", "type": "LATENT", "links": [], "slot_index": 0}]
}
nodes.append(latent_node)

# 12. FLUX KSampler (Node 12)
ks_id = next_node()
ks_node = {
    "id": ks_id,
    "type": "KSampler",
    "pos": [2000, 180],
    "size": [320, 350],
    "title": "FLUX KSampler (Seed 7 Fixed)",
    "widgets_values": [7, "fixed", 20, 1.0, "euler", "simple", 1.0],
    "inputs": [
        {"name": "model", "type": "MODEL", "link": None},
        {"name": "positive", "type": "CONDITIONING", "link": None},
        {"name": "negative", "type": "CONDITIONING", "link": None},
        {"name": "latent_image", "type": "LATENT", "link": None}
    ],
    "outputs": [{"name": "LATENT", "type": "LATENT", "links": [], "slot_index": 0}]
}
nodes.append(ks_node)

l_lm = add_link(lora_id, 0, ks_id, 0, "MODEL")
lora_node["outputs"][0]["links"].append(l_lm)
ks_node["inputs"][0]["link"] = l_lm

l_gp = add_link(guide_id, 0, ks_id, 1, "CONDITIONING")
guide_node["outputs"][0]["links"].append(l_gp)
ks_node["inputs"][1]["link"] = l_gp

l_gn = add_link(neg_clip_id, 0, ks_id, 2, "CONDITIONING")
neg_clip_node["outputs"][0]["links"].append(l_gn)
ks_node["inputs"][2]["link"] = l_gn

l_gl = add_link(latent_id, 0, ks_id, 3, "LATENT")
latent_node["outputs"][0]["links"].append(l_gl)
ks_node["inputs"][3]["link"] = l_gl

# 13. VAELoader (Node 13)
vae_id = next_node()
vae_node = {
    "id": vae_id,
    "type": "VAELoader",
    "pos": [940, 400],
    "size": [320, 90],
    "title": "FLUX VAE (ae.safetensors)",
    "widgets_values": ["ae.safetensors"],
    "outputs": [{"name": "VAE", "type": "VAE", "links": [], "slot_index": 0}]
}
nodes.append(vae_node)

# 14. VAEDecode (Node 14)
dec_id = next_node()
dec_node = {
    "id": dec_id,
    "type": "VAEDecode",
    "pos": [2360, 180],
    "size": [240, 100],
    "title": "FLUX VAE Decode",
    "inputs": [
        {"name": "samples", "type": "LATENT", "link": None},
        {"name": "vae", "type": "VAE", "link": None}
    ],
    "outputs": [{"name": "IMAGE", "type": "IMAGE", "links": [], "slot_index": 0}]
}
nodes.append(dec_node)

l_kd = add_link(ks_id, 0, dec_id, 0, "LATENT")
ks_node["outputs"][0]["links"].append(l_kd)
dec_node["inputs"][0]["link"] = l_kd

l_vd = add_link(vae_id, 0, dec_id, 1, "VAE")
vae_node["outputs"][0]["links"].append(l_vd)
dec_node["inputs"][1]["link"] = l_vd

# 15. SaveImage (Node 15)
save_id = next_node()
save_node = {
    "id": save_id,
    "type": "SaveImage",
    "pos": [2640, 180],
    "size": [380, 380],
    "title": "Save Final VLM FLUX LookDev Master",
    "widgets_values": ["Apple_Spatial_Gemini_VLM_FLUX_Master"],
    "inputs": [{"name": "images", "type": "IMAGE", "link": None}]
}
nodes.append(save_node)

l_ds = add_link(dec_id, 0, save_id, 0, "IMAGE")
dec_node["outputs"][0]["links"].append(l_ds)
save_node["inputs"][0]["link"] = l_ds

workflow = {
    "last_node_id": node_id - 1,
    "last_link_id": link_id - 1,
    "nodes": nodes,
    "links": links,
    "groups": [
        {
            "title": "🌐 1. 3D GUIDES: COLOR, NORMAL, DEPTH (NO SHADING, ZERO MASKS)",
            "bounding": [80, 40, 320, 940],
            "color": "#10b981",
            "font_size": 22
        },
        {
            "title": "💎 2. GEMINI 3.5 VLM REAL-TIME VISION-TO-PROMPT SYNTHESIZER",
            "bounding": [430, 180, 480, 560],
            "color": "#8b5cf6",
            "font_size": 22
        },
        {
            "title": "✨ 3. FLUX.1-DEV + APPLE LORA MASTER ENGINE (SEED 7 FIXED)",
            "bounding": [920, 40, 2120, 720],
            "color": "#0369a1",
            "font_size": 24
        }
    ],
    "config": {},
    "extra": {"ds": {"scale": 0.8, "offset": [50, 50]}},
    "version": 0.4
}

out_path = Path("d:/Dev/spatial-gen-pipeline/comfyui_workflows/apple_spatial_gemini_vlm_flux_nomask_master.json")
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(workflow, f, indent=2, ensure_ascii=False)

comfy_user_wf = Path(r"C:\Users\DJ\AppData\Local\Comfy-Desktop\ComfyUI-Installs\ComfyUI\ComfyUI\user\default\workflows\apple_spatial_gemini_vlm_flux_nomask_master.json")
comfy_user_wf.parent.mkdir(parents=True, exist_ok=True)
with open(comfy_user_wf, "w", encoding="utf-8") as f:
    json.dump(workflow, f, indent=2, ensure_ascii=False)

print("SUCCESS! Updated 3-pass workflow saved to:")
print(" 1.", out_path)
print(" 2.", comfy_user_wf)
