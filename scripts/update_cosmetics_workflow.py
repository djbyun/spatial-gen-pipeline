import json

def update_workflow_to_luxury_cosmetics():
    wf_path = "comfyui_workflows/apple_spatial_hybrid_sdxl_flux_lookdev_workflow.json"
    with open(wf_path, "r", encoding="utf-8") as f:
        wf = json.load(f)

    for node in wf["nodes"]:
        nid = node["id"]
        
        # 1. 1024x1024 1:1 Canvas
        if nid == 37 and node["type"] == "EmptyLatentImage":
            node["widgets_values"] = [1024, 1024, 1]
            node["title"] = "✨ 캔버스 생성 (3D 가이드 1:1 일치 1024x1024)"

        # 2. ControlNet Strength for Crisp 3D Swatch Shapes
        if nid == 35 and node["type"] == "ControlNetApplyAdvanced":
            node["widgets_values"] = [0.80, 0.0, 0.85]
            node["title"] = "📐 3D Depth 볼륨 형상 락 (강도 0.80)"
        if nid == 36 and node["type"] == "ControlNetApplyAdvanced":
            node["widgets_values"] = [0.75, 0.0, 0.80]
            node["title"] = "🧭 3D Normal 표면 굴곡 락 (강도 0.75)"

        # 3. Luxury Cosmetics Regional Prompts
        if nid == 7 and node["type"] == "CLIPTextEncode":
            node["title"] = "🌐 [Prompt BG] 럭셔리 미니멀 스튜디오 바닥"
            node["widgets_values"] = [
                "a luxury beauty commercial product photo, solid clean warm neutral off-white matte studio tabletop surface, soft direct studio spotlight with crisp natural contact cast shadows, 8k uhd photorealistic"
            ]

        if nid == 10 and node["type"] == "CLIPTextEncode":
            node["title"] = "🎨 [Prompt 01 - 중앙 돔] 테라코타 클레이 밤"
            node["widgets_values"] = [
                "rich dark warm terracotta chocolate brown cosmetic clay scrub paste, smooth dense muddy balm swatch with fine micro texture, soft satin matte finish, clean sculptural dome shape"
            ]

        if nid == 13 and node["type"] == "CLIPTextEncode":
            node["title"] = "🎨 [Prompt 02 - 파츠 2] 순백 휘핑크림"
            node["widgets_values"] = [
                "pure opaque bright snow white dense whipped cosmetic facial cream swatch, rich buttery texture, soft sculpted spatula peaks, luxurious satin glow, clean edges"
            ]

        if nid == 16 and node["type"] == "CLIPTextEncode":
            node["title"] = "🎨 [Prompt 03 - 파츠 3] 로즈 핑크 글로스 젤"
            node["widgets_values"] = [
                "translucent pastel rose pink hydrating cosmetic jelly serum, glossy wet look, dewy luminous sheen with subtle light reflections, clean sculpted jelly dome"
            ]

        if nid == 19 and node["type"] == "CLIPTextEncode":
            node["title"] = "🎨 [Prompt 04 - 파츠 4] 유기농 말차 세이지 그린"
            node["widgets_values"] = [
                "natural earthy matcha sage olive green soothing botanical clay paste, rich herbal cream texture, soft organic matte finish, clean rounded shape"
            ]

        if nid == 22 and node["type"] == "CLIPTextEncode":
            node["title"] = "🎨 [Prompt 05 - 파츠 5] 골든 앰버 허니 밤"
            node["widgets_values"] = [
                "rich golden amber honey translucent facial balm, glowing warm radiant luster, dewy glistening melted balm texture, glossy reflections"
            ]

        if nid == 25 and node["type"] == "CLIPTextEncode":
            node["title"] = "🎨 [Prompt 06 - 파츠 6] 벨벳 피치 파운데이션"
            node["widgets_values"] = [
                "smooth warm nude peach beige liquid foundation swatch, soft velvety matte powdery finish, flawless cosmetic makeup texture, clean contoured dome"
            ]

        # 4. Stage 1 Negative Prompt (Blocks metal, gadgets, messy blobs, low quality)
        if nid == 28 and node["type"] == "CLIPTextEncode":
            node["title"] = "🚫 [Stage 1] 전역 부정 프롬프트"
            node["widgets_values"] = [
                "metal, metallic, steel, chrome, gadget, electronics, plastic container, bottle, lid, razor, text, watermark, signature, blurry, low resolution, deformed, noisy artifacts"
            ]

        # 5. Stage 2 FLUX Prompt (Refines luxury cosmetic textures, highlights, specularities)
        if nid == 54 and node["type"] == "CLIPTextEncode":
            node["title"] = "✨ [Stage 2] FLUX 화장품 CMF 리파인 프롬프트"
            node["widgets_values"] = [
                "commercial beauty product lookdev, luxury skincare cosmetic swatches of rich creams, translucent hydrating gels, clay paste and golden balm, ultra-realistic texture details, soft studio lighting with ambient occlusion, pristine commercial photography, 8k resolution"
            ]

        if nid == 56 and node["type"] == "CLIPTextEncode":
            node["title"] = "🚫 [Stage 2] FLUX 네거티브 프롬프트"
            node["widgets_values"] = [
                "metal, metallic, plastic, gadget, electronics, blurry, noisy, low quality, distorted, bad reflections, overexposed"
            ]

    with open(wf_path, "w", encoding="utf-8") as f:
        json.dump(wf, f, indent=2, ensure_ascii=False)

    print(f"Updated {wf_path} with Luxury Cosmetics CMF LookDev prompts!")

if __name__ == "__main__":
    update_workflow_to_luxury_cosmetics()
