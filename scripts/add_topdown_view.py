import json

def add_topdown_view_to_workflow():
    wf_path = "comfyui_workflows/apple_spatial_hybrid_sdxl_flux_lookdev_workflow.json"
    with open(wf_path, "r", encoding="utf-8") as f:
        wf = json.load(f)

    for node in wf["nodes"]:
        nid = node["id"]
        
        # 1. Background Prompt with explicit TOP-DOWN FLAT LAY camera angle
        if nid == 7 and node["type"] == "CLIPTextEncode":
            node["title"] = "🌐 [Prompt BG] 탑뷰 (Top-Down Flat Lay) 스튜디오 바닥"
            node["widgets_values"] = [
                "top-down flat lay view, directly from above, overhead camera angle looking straight down, luxury beauty commercial cosmetics swatch photography on a clean warm neutral off-white matte studio tabletop surface, soft direct overhead spotlight, clean contact cast shadows, 8k uhd photorealistic"
            ]

        # 2. Add top-down context to individual swatches
        if nid == 10 and node["type"] == "CLIPTextEncode":
            node["title"] = "🎨 [Prompt 01 - 중앙 돔] 테라코타 클레이 밤 (Top View)"
            node["widgets_values"] = [
                "top-down view, rich warm dark terracotta chocolate brown cosmetic clay scrub paste, smooth dense circular muddy balm swatch on tabletop, fine micro texture, soft satin matte finish, clean rounded edges"
            ]

        if nid == 13 and node["type"] == "CLIPTextEncode":
            node["title"] = "🎨 [Prompt 02 - 파츠 2] 순백 휘핑크림 (Top View)"
            node["widgets_values"] = [
                "top-down view, pure opaque bright snow white dense whipped cosmetic facial cream swatch on flat surface, rich buttery texture, soft sculpted spatula peaks, luxurious satin glow, clean distinct edges"
            ]

        if nid == 16 and node["type"] == "CLIPTextEncode":
            node["title"] = "🎨 [Prompt 03 - 파츠 3] 로즈 핑크 글로스 젤 (Top View)"
            node["widgets_values"] = [
                "top-down view, translucent pastel rose pink hydrating cosmetic jelly serum swatch, glossy wet look, dewy luminous sheen with sparkling light reflections, clean sculpted jelly droplet"
            ]

        if nid == 19 and node["type"] == "CLIPTextEncode":
            node["title"] = "🎨 [Prompt 04 - 파츠 4] 말차 세이지 그린 (Top View)"
            node["widgets_values"] = [
                "top-down view, natural earthy matcha sage olive green soothing botanical clay paste swatch, rich herbal cream texture, soft organic matte finish, clean rounded shape"
            ]

        if nid == 22 and node["type"] == "CLIPTextEncode":
            node["title"] = "🎨 [Prompt 05 - 파츠 5] 골든 앰버 허니 밤 (Top View)"
            node["widgets_values"] = [
                "top-down view, rich golden amber honey translucent facial balm swatch, glowing warm radiant luster, dewy glistening melted balm texture, glossy reflections"
            ]

        if nid == 25 and node["type"] == "CLIPTextEncode":
            node["title"] = "🎨 [Prompt 06 - 파츠 6] 벨벳 피치 파운데이션 (Top View)"
            node["widgets_values"] = [
                "top-down view, smooth warm nude peach beige liquid foundation swatch, soft velvety matte powdery finish, flawless cosmetic makeup texture, clean contoured dome"
            ]

        # 3. Stage 1 Negative Prompt (Blocks side view, standing perspective)
        if nid == 28 and node["type"] == "CLIPTextEncode":
            node["title"] = "🚫 [Stage 1] 전역 부정 프롬프트 (사이드뷰 차단)"
            node["widgets_values"] = [
                "side view, 3/4 perspective view, standing upright, horizontal camera angle, angled perspective, metal, metallic, chrome, gadget, electronics, bottle, container, lid, blurry, low quality, deformed, messy blobs"
            ]

        # 4. Stage 2 FLUX Prompt (Reinforce Top-Down Flat Lay LookDev)
        if nid == 54 and node["type"] == "CLIPTextEncode":
            node["title"] = "✨ [Stage 2] FLUX 탑뷰 화장품 CMF 리파인"
            node["widgets_values"] = [
                "commercial beauty product lookdev, top-down flat lay view, overhead camera looking directly down, luxury skincare cosmetic swatches of rich creams, translucent hydrating gels, clay paste and golden balm arranged on clean surface, ultra-realistic micro texture details, soft studio lighting with ambient occlusion, 8k resolution"
            ]

        if nid == 56 and node["type"] == "CLIPTextEncode":
            node["title"] = "🚫 [Stage 2] FLUX 네거티브 프롬프트"
            node["widgets_values"] = [
                "side view, angled perspective, metal, metallic, plastic, gadget, electronics, blurry, noisy, low quality, distorted, bad reflections, overexposed"
            ]

    with open(wf_path, "w", encoding="utf-8") as f:
        json.dump(wf, f, indent=2, ensure_ascii=False)

    print(f"Added Top-Down Flat Lay camera perspective to {wf_path} successfully!")

if __name__ == "__main__":
    add_topdown_view_to_workflow()
