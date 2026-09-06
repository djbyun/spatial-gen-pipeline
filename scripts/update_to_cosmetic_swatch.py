import json

def update_to_cosmetic_swatch():
    wf_path = "comfyui_workflows/apple_spatial_hybrid_sdxl_flux_lookdev_workflow.json"
    with open(wf_path, "r", encoding="utf-8") as f:
        wf = json.load(f)

    for node in wf["nodes"]:
        nid = node["id"]
        
        # 1. Background
        if nid == 7 and node["type"] == "CLIPTextEncode":
            node["title"] = "🌐 [Prompt BG] 탑뷰 코스메틱 스와치 스튜디오"
            node["widgets_values"] = [
                "top-down flat lay view, directly from above, luxury beauty cosmetic swatch palette photography, cosmetic texture swatches arranged on a clean warm neutral off-white matte studio tabletop surface, soft overhead studio spotlight, crisp contact cast shadows, professional commercial beauty photography, 8k uhd"
            ]

        # 2. Individual Cosmetic Swatches
        if nid == 10 and node["type"] == "CLIPTextEncode":
            node["title"] = "🎨 [Prompt 01] 테라코타 클레이 밤 코스메틱 스와치"
            node["widgets_values"] = [
                "top-down flat lay view, a rich dark warm terracotta chocolate brown cosmetic clay balm swatch, thick opaque skincare mud paste swatch smear on tabletop, fine micro texture, soft satin matte finish, distinct cosmetic swatch shape"
            ]

        if nid == 13 and node["type"] == "CLIPTextEncode":
            node["title"] = "🎨 [Prompt 02] 순백 휘핑크림 코스메틱 스와치"
            node["widgets_values"] = [
                "top-down flat lay view, pure opaque bright snow white dense whipped facial cream cosmetic swatch, rich buttery skincare cream swatch with spatula texture ridges, luxurious satin glow, clean distinct cosmetic swatch edges"
            ]

        if nid == 16 and node["type"] == "CLIPTextEncode":
            node["title"] = "🎨 [Prompt 03] 로즈 핑크 글로스 젤 코스메틱 스와치"
            node["widgets_values"] = [
                "top-down flat lay view, translucent pastel rose pink hydrating cosmetic gel serum swatch, glossy wet jelly droplet swatch, dewy luminous sheen with sparkling light reflections, clean cosmetic swatch drop"
            ]

        if nid == 19 and node["type"] == "CLIPTextEncode":
            node["title"] = "🎨 [Prompt 04] 말차 세이지 클레이 코스메틱 스와치"
            node["widgets_values"] = [
                "top-down flat lay view, natural earthy matcha sage olive green soothing botanical clay paste cosmetic swatch, rich herbal skincare cream swatch, soft organic matte finish, clean rounded cosmetic swatch shape"
            ]

        if nid == 22 and node["type"] == "CLIPTextEncode":
            node["title"] = "🎨 [Prompt 05] 골든 앰버 허니 밤 코스메틱 스와치"
            node["widgets_values"] = [
                "top-down flat lay view, rich golden amber honey translucent facial melting balm cosmetic swatch, glowing warm radiant luster, dewy glistening melted balm skincare swatch, glossy reflections"
            ]

        if nid == 25 and node["type"] == "CLIPTextEncode":
            node["title"] = "🎨 [Prompt 06] 벨벳 누드 피치 파운데이션 코스메틱 스와치"
            node["widgets_values"] = [
                "top-down flat lay view, smooth warm nude peach beige liquid foundation cosmetic swatch, soft velvety matte powdery makeup foundation swatch smear, flawless cosmetic finish, clean cosmetic swatch shape"
            ]

        # 3. Negative Prompt
        if nid == 28 and node["type"] == "CLIPTextEncode":
            node["title"] = "🚫 [Stage 1] 전역 부정 프롬프트"
            node["widgets_values"] = [
                "side view, 3/4 perspective, standing, metal, metallic, chrome, gadget, electronics, bottle, jar, tube, lid, container, razor, food, blurry, messy, low quality, deformed"
            ]

        # 4. Stage 2 FLUX Refine Prompt
        if nid == 54 and node["type"] == "CLIPTextEncode":
            node["title"] = "✨ [Stage 2] FLUX 코스메틱 스와치 CMF 리파인"
            node["widgets_values"] = [
                "commercial beauty product lookdev, top-down flat lay view, overhead camera looking directly down, professional luxury skincare cosmetic swatches of rich facial creams, translucent hydrating jelly serums, botanical clay pastes and golden honey balms arranged on pristine studio surface, ultra-realistic micro texture details, soft studio lighting with ambient occlusion, 8k commercial photography"
            ]

    with open(wf_path, "w", encoding="utf-8") as f:
        json.dump(wf, f, indent=2, ensure_ascii=False)

    print(f"Updated all nodes with explicit 'cosmetic swatch' terminology in {wf_path}!")

if __name__ == "__main__":
    update_to_cosmetic_swatch()
