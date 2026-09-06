import json

def update_and_format_hybrid_workflow():
    wf_path = "comfyui_workflows/apple_spatial_hybrid_sdxl_flux_lookdev_workflow.json"
    with open(wf_path, "r", encoding="utf-8") as f:
        wf = json.load(f)

    # 1. Update Prompts & ControlNet settings
    for node in wf["nodes"]:
        nid = node["id"]
        
        # 1024x1024 1:1 Canvas
        if nid == 37 and node["type"] == "EmptyLatentImage":
            node["widgets_values"] = [1024, 1024, 1]
            node["title"] = "✨ 캔버스 생성 (3D 가이드 1:1 일치 1024x1024)"

        # Boost ControlNet Strength to Lock 3D Geometry
        if nid == 35 and node["type"] == "ControlNetApplyAdvanced":
            node["widgets_values"] = [0.85, 0.0, 0.90]
            node["title"] = "📐 3D Depth 형상 락 (강도 0.85)"
        if nid == 36 and node["type"] == "ControlNetApplyAdvanced":
            node["widgets_values"] = [0.80, 0.0, 0.85]
            node["title"] = "🧭 3D Normal 굴곡 락 (강도 0.80)"

        # Apple Hardware CMF Part Prompts
        if nid == 7 and node["type"] == "CLIPTextEncode":
            node["title"] = "🌐 [Prompt BG] 미니멀 스튜디오 배경"
            node["widgets_values"] = [
                "apple minimal craft style, clean seamless neutral matte light gray studio backdrop, soft diffuse ambient occlusion contact shadows, pristine commercial product showcase"
            ]

        if nid == 10 and node["type"] == "CLIPTextEncode":
            node["title"] = "🎨 [Prompt 01 - 중앙/본체] 아노다이징 알루미늄"
            node["widgets_values"] = [
                "apple minimal craft style, solid space gray bead-blasted anodized aluminum metal chassis, fine sandblasted micro grain, crisp chamfered edge highlights, clean matte surface"
            ]

        if nid == 13 and node["type"] == "CLIPTextEncode":
            node["title"] = "🎨 [Prompt 02 - 파츠 2] 내추럴 실버 티타늄"
            node["widgets_values"] = [
                "apple minimal craft style, natural silver matte brushed titanium enclosure, precision cnc milled edge, subtle metallic sheen, pristine clean geometry"
            ]

        if nid == 16 and node["type"] == "CLIPTextEncode":
            node["title"] = "🎨 [Prompt 03 - 파츠 3] 블랙 사파이어 글래스"
            node["widgets_values"] = [
                "apple minimal craft style, deep black optical sapphire crystal glass, antireflective purple-tint coating, clean sharp specular reflections, glossy polished finish"
            ]

        if nid == 19 and node["type"] == "CLIPTextEncode":
            node["title"] = "🎨 [Prompt 04 - 파츠 4] 매트 널링 다이얼/버튼"
            node["widgets_values"] = [
                "apple minimal craft style, tactile knurled matte aluminum digital crown dial, precision micro grooves, dark graphite finish, clean solid metal"
            ]

        if nid == 22 and node["type"] == "CLIPTextEncode":
            node["title"] = "🎨 [Prompt 05 - 파츠 5] 세라믹 글래스 패널"
            node["widgets_values"] = [
                "apple minimal craft style, pristine dark ceramic shield glass panel, deep gloss surface, minimal reflection, solid precision manufactured"
            ]

        if nid == 25 and node["type"] == "CLIPTextEncode":
            node["title"] = "🎨 [Prompt 06 - 파츠 6] 플루오로엘라스토머 밴드"
            node["widgets_values"] = [
                "apple minimal craft style, smooth matte fluoroelastomer soft-touch surface, clean molded edges, midnight navy blue color, velvety premium finish"
            ]

        # Stage 1 Negative Prompt
        if nid == 28 and node["type"] == "CLIPTextEncode":
            node["title"] = "🚫 [Stage 1] 전역 부정 프롬프트"
            node["widgets_values"] = [
                "blurry, powder, mud, messy, clay, cream, food, smeared, distorted, noisy, artifacts, watermark, text, signature, bad geometry, low resolution"
            ]

        # Stage 2 FLUX LoRA
        if nid == 51 and node["type"] == "LoraLoader":
            node["widgets_values"] = ["apple_minimal_craft_flux_v1.safetensors", 1.0, 1.0]

    # Save
    with open(wf_path, "w", encoding="utf-8") as f:
        json.dump(wf, f, indent=2, ensure_ascii=False)

    print("Updated apple_spatial_hybrid_sdxl_flux_lookdev_workflow.json with clean Apple CMF settings!")

if __name__ == "__main__":
    update_and_format_hybrid_workflow()
