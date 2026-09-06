import json
import os

def build_hybrid_workflow():
    with open("comfyui_workflows/apple_spatial_oneshot_regional_workflow_no_LoRA.json", "r", encoding="utf-8") as f:
        wf = json.load(f)

    # 1. Update Note Header
    for node in wf["nodes"]:
        if node["type"] == "Note":
            node["title"] = "🍏 [2-Stage Hybrid Architecture] 3D SDXL Regional -> FLUX LoRA CMF LookDev"
            node["widgets_values"] = [
                "🏆 2-Stage 하이브리드 공간 룩데브 프로덕션 워크플로우\n\n"
                "1. Stage 1: SDXL Base + 3D ControlNet + Regional Binary Tree Masks\n"
                "   - Houdini 3D Guide(Depth, Normal, 6개 부품 마스크)를 주입하여 100% 기하학적 정렬 및 기초 색상 배치 완성.\n"
                "   - 오차 없는 순수 베이스라인 출력을 위해 SDXL LoRA 없이 구동.\n\n"
                "2. Stage 2: FLUX.1-dev (FP8) + Apple Craft LoRA (Denoise 0.25)\n"
                "   - Stage 1의 1차 렌더 이미지를 이어받아 FLUX의 12B DiT + LoRA로 아노다이징 알루미늄, 유리 반사, AO 라이팅 완성.\n"
                "   - 형태는 100% 보존하면서 표면 셰이딩(CMF)만 상용 Keynote 렌더 수준으로 업그레이드."
            ]

    # Find Stage 1 output (Node 39 VAEDecode output image link)
    stage1_vae_decode = None
    for node in wf["nodes"]:
        if node["id"] == 39:
            stage1_vae_decode = node
            node["title"] = "🖼️ [Stage 1] SDXL 1차 베이스 렌더"
        if node["id"] == 40:
            node["title"] = "💾 [Stage 1 임시 저장] SDXL_Base_Pass"
            node["widgets_values"] = ["SDXL_Stage1_Base_Pass"]

    # Calculate max IDs
    max_node_id = max(n["id"] for n in wf["nodes"])
    max_link_id = max(l[0] for l in wf["links"])

    # Stage 2 (FLUX) Node Definitions starting from X: 3700
    base_x = 3700
    
    # 50: UNETLoader (FLUX.1-dev FP8)
    n_unet = {
        "id": 50,
        "type": "UNETLoader",
        "pos": [base_x, 60],
        "size": [315, 82],
        "flags": {},
        "order": 40,
        "mode": 0,
        "outputs": [{"name": "MODEL", "type": "MODEL", "links": [101], "slot_index": 0}],
        "title": "⚡ [Stage 2] FLUX.1-dev FP8 메인 엔진",
        "properties": {"Node name for S&R": "UNETLoader"},
        "widgets_values": ["flux1-dev-fp8.safetensors", "fp8_e4m3fn"]
    }

    # 51: LoraLoader (FLUX Apple Craft LoRA)
    n_lora = {
        "id": 51,
        "type": "LoraLoader",
        "pos": [base_x + 350, 60],
        "size": [315, 126],
        "flags": {},
        "order": 41,
        "mode": 0,
        "inputs": [
            {"name": "model", "type": "MODEL", "link": 101},
            {"name": "clip", "type": "CLIP", "link": 102}
        ],
        "outputs": [
            {"name": "MODEL", "type": "MODEL", "links": [103], "slot_index": 0},
            {"name": "CLIP", "type": "CLIP", "links": [104], "slot_index": 1}
        ],
        "title": "🍏 [Stage 2] Apple Minimal Craft FLUX LoRA",
        "properties": {"Node name for S&R": "LoraLoader"},
        "widgets_values": ["apple_minimal_craft_flux_v1.safetensors", 1.0, 1.0]
    }

    # 52: DualCLIPLoader (T5XXL + CLIP-L)
    n_clip = {
        "id": 52,
        "type": "DualCLIPLoader",
        "pos": [base_x, 200],
        "size": [315, 106],
        "flags": {},
        "order": 42,
        "mode": 0,
        "outputs": [{"name": "CLIP", "type": "CLIP", "links": [102], "slot_index": 0}],
        "title": "🧠 [Stage 2] FLUX 듀얼 텍스트 인코더 (T5+CLIP)",
        "properties": {"Node name for S&R": "DualCLIPLoader"},
        "widgets_values": ["t5xxl_fp8_e4m3fn.safetensors", "clip_l.safetensors", "flux"]
    }

    # 53: VAELoader (ae.safetensors)
    n_vae = {
        "id": 53,
        "type": "VAELoader",
        "pos": [base_x, 360],
        "size": [315, 58],
        "flags": {},
        "order": 43,
        "mode": 0,
        "outputs": [{"name": "VAE", "type": "VAE", "links": [105, 106], "slot_index": 0}],
        "title": "🔍 [Stage 2] FLUX 16채널 VAE (ae.safetensors)",
        "properties": {"Node name for S&R": "VAELoader"},
        "widgets_values": ["ae.safetensors"]
    }

    # 54: CLIPTextEncode (FLUX Positive Prompt)
    n_pos_prompt = {
        "id": 54,
        "type": "CLIPTextEncode",
        "pos": [base_x + 700, 60],
        "size": [400, 180],
        "flags": {},
        "order": 44,
        "mode": 0,
        "inputs": [{"name": "clip", "type": "CLIP", "link": 104}],
        "outputs": [{"name": "CONDITIONING", "type": "CONDITIONING", "links": [107], "slot_index": 0}],
        "title": "✨ [Stage 2] FLUX 룩데브 프롬프트 (CMF Refine)",
        "properties": {"Node name for S&R": "CLIPTextEncode"},
        "widgets_values": [
            "apple minimal craft style, clean matte studio lookdev, premium bead-blasted anodized aluminum finish, subtle chamfer highlights, high precision glass reflections, soft studio ambient occlusion lighting, clean minimal studio background, 8k commercial keynote lookdev"
        ]
    }

    # 55: FluxGuidance
    n_guidance = {
        "id": 55,
        "type": "FluxGuidance",
        "pos": [base_x + 1130, 60],
        "size": [210, 58],
        "flags": {},
        "order": 45,
        "mode": 0,
        "inputs": [{"name": "conditioning", "type": "CONDITIONING", "link": 107}],
        "outputs": [{"name": "CONDITIONING", "type": "CONDITIONING", "links": [108], "slot_index": 0}],
        "title": "🎛️ FLUX 가이던스 (3.5)",
        "properties": {"Node name for S&R": "FluxGuidance"},
        "widgets_values": [3.5]
    }

    # 56: CLIPTextEncode (FLUX Negative Prompt)
    n_neg_prompt = {
        "id": 56,
        "type": "CLIPTextEncode",
        "pos": [base_x + 700, 270],
        "size": [400, 120],
        "flags": {},
        "order": 46,
        "mode": 0,
        "inputs": [{"name": "clip", "type": "CLIP", "link": 104}],
        "outputs": [{"name": "CONDITIONING", "type": "CONDITIONING", "links": [109], "slot_index": 0}],
        "title": "🚫 [Stage 2] FLUX 네거티브 프롬프트",
        "properties": {"Node name for S&R": "CLIPTextEncode"},
        "widgets_values": ["blurry, noisy, low quality, distorted, bad reflections, overexposed, plastic looking"]
    }

    # 57: VAEEncode (Stage 1 Output Image -> FLUX Latent)
    # Stage 1 image is output slot 0 of Node 39 (VAEDecode) via link 30
    n_vae_encode = {
        "id": 57,
        "type": "VAEEncode",
        "pos": [base_x + 700, 430],
        "size": [210, 46],
        "flags": {},
        "order": 47,
        "mode": 0,
        "inputs": [
            {"name": "pixels", "type": "IMAGE", "link": 30},
            {"name": "vae", "type": "VAE", "link": 105}
        ],
        "outputs": [{"name": "LATENT", "type": "LATENT", "links": [110], "slot_index": 0}],
        "title": "📦 [Stage 2] Stage 1 이미지 -> FLUX 잠재공간 변환",
        "properties": {"Node name for S&R": "VAEEncode"}
    }

    # 58: KSampler (FLUX Stage 2 Sampler - Low Denoise 0.25)
    n_sampler = {
        "id": 58,
        "type": "KSampler",
        "pos": [base_x + 1380, 60],
        "size": [315, 474],
        "flags": {},
        "order": 48,
        "mode": 0,
        "inputs": [
            {"name": "model", "type": "MODEL", "link": 103},
            {"name": "positive", "type": "CONDITIONING", "link": 108},
            {"name": "negative", "type": "CONDITIONING", "link": 109},
            {"name": "latent_image", "type": "LATENT", "link": 110}
        ],
        "outputs": [{"name": "LATENT", "type": "LATENT", "links": [111], "slot_index": 0}],
        "title": "⚡ [Stage 2 렌더러] FLUX CMF 리파이너 (Denoise 0.25)",
        "properties": {"Node name for S&R": "KSampler"},
        "widgets_values": [42, "randomize", 20, 1.0, "euler", "simple", 0.25]
    }

    # 59: VAEDecode (FLUX Latent -> RGB Image)
    n_vae_decode = {
        "id": 59,
        "type": "VAEDecode",
        "pos": [base_x + 1730, 60],
        "size": [210, 46],
        "flags": {},
        "order": 49,
        "mode": 0,
        "inputs": [
            {"name": "samples", "type": "LATENT", "link": 111},
            {"name": "vae", "type": "VAE", "link": 106}
        ],
        "outputs": [{"name": "IMAGE", "type": "IMAGE", "links": [112], "slot_index": 0}],
        "title": "🖼️ [Stage 2] 최종 FLUX VAE 디코드",
        "properties": {"Node name for S&R": "VAEDecode"}
    }

    # 60: SaveImage (Final Output)
    n_save = {
        "id": 60,
        "type": "SaveImage",
        "pos": [base_x + 1980, 60],
        "size": [380, 420],
        "flags": {},
        "order": 50,
        "mode": 0,
        "inputs": [{"name": "images", "type": "IMAGE", "link": 112}],
        "title": "🏆 [최종 완성작] Apple Spatial Hybrid LookDev Master",
        "properties": {"Node name for S&R": "SaveImage"},
        "widgets_values": ["Apple_Spatial_Hybrid_FLUX_Master"]
    }

    # Append new nodes
    new_nodes = [n_unet, n_lora, n_clip, n_vae, n_pos_prompt, n_guidance, n_neg_prompt, n_vae_encode, n_sampler, n_vae_decode, n_save]
    wf["nodes"].extend(new_nodes)

    # Append new links
    # [link_id, from_node, from_slot, to_node, to_slot, type]
    new_links = [
        [101, 50, 0, 51, 0, "MODEL"],
        [102, 52, 0, 51, 1, "CLIP"],
        [103, 51, 0, 58, 0, "MODEL"],
        [104, 51, 1, 54, 0, "CLIP"],
        [105, 53, 0, 57, 1, "VAE"],
        [106, 53, 0, 59, 1, "VAE"],
        [107, 54, 0, 55, 0, "CONDITIONING"],
        [108, 55, 0, 58, 1, "CONDITIONING"],
        [109, 56, 0, 58, 2, "CONDITIONING"],
        [110, 57, 0, 58, 3, "LATENT"],
        [111, 58, 0, 59, 0, "LATENT"],
        [112, 59, 0, 60, 0, "IMAGE"]
    ]
    wf["links"].extend(new_links)
    wf["last_node_id"] = 60
    wf["last_link_id"] = 112

    out_path = "comfyui_workflows/apple_spatial_hybrid_sdxl_flux_lookdev_workflow.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(wf, f, indent=2, ensure_ascii=False)

    print(f"Successfully generated: {out_path}")
    print(f"Total Nodes: {len(wf['nodes'])}, Total Links: {len(wf['links'])}")

if __name__ == "__main__":
    build_hybrid_workflow()
