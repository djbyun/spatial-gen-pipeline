import json

def remove_scrub_particles():
    wf_path = "comfyui_workflows/apple_spatial_hybrid_sdxl_flux_lookdev_workflow.json"
    with open(wf_path, "r", encoding="utf-8") as f:
        wf = json.load(f)

    # Comprehensive anti-granule / anti-bead negative terms
    anti_granules_negative = (
        "scrub beads, exfoliating granules, micro-beads, beads, seeds, dots, "
        "grainy particles, rough sand, bumps, pimples, blemishes, clumps, flecks, "
        "speckled texture, spots, stray drops, splatters, trypophobia, porous, "
        "dirty spots, coarse texture, gritty"
    )

    for node in wf["nodes"]:
        nid = node["id"]

        # 1. Prompt 01 (Clay Balm) - Remove "scrub", emphasize "smooth silky dense cream"
        if nid == 10 and node["type"] == "CLIPTextEncode":
            node["title"] = "🎨 [Prompt 01] 매끄러운 테라코타 클레이 밤 (No Particles)"
            node["widgets_values"] = [
                "top-down flat lay view, a rich dark warm terracotta chocolate brown cosmetic clay balm swatch, ultra-smooth silky dense skincare cream balm swatch smear on tabletop, completely smooth homogeneous buttery texture, soft satin matte finish, flawless clean surface, perfectly smooth cosmetic swatch shape, no particles"
            ]

        # 2. Prompt 04 (Matcha Clay) - Emphasize "creamy smooth paste without flecks"
        if nid == 19 and node["type"] == "CLIPTextEncode":
            node["title"] = "🎨 [Prompt 04] 매끄러운 말차 수딩 밤 (No Particles)"
            node["widgets_values"] = [
                "top-down flat lay view, natural earthy matcha sage olive green soothing botanical cream paste cosmetic swatch, completely smooth silky refined skincare cream swatch, soft organic matte finish, flawless seamless texture, clean rounded cosmetic swatch shape, no grains"
            ]

        # 3. Stage 1 Negative Prompt (Add anti-granule / stray droplet blocker)
        if nid == 28 and node["type"] == "CLIPTextEncode":
            node["title"] = "🚫 [Stage 1] 전역 부정 프롬프트 (알갱이/점/얼룩 차단)"
            node["widgets_values"] = [
                f"{anti_granules_negative}, side view, 3/4 perspective, standing, metal, metallic, chrome, gadget, electronics, bottle, jar, tube, lid, container, razor, food, blurry, messy, low quality, deformed"
            ]

        # 4. Stage 2 FLUX Positive Prompt (Emphasize smooth, silk, pristine textures)
        if nid == 54 and node["type"] == "CLIPTextEncode":
            node["title"] = "✨ [Stage 2] FLUX 실키 코스메틱 스와치 리파인"
            node["widgets_values"] = [
                "commercial beauty product lookdev, top-down flat lay view, overhead camera looking directly down, professional luxury skincare cosmetic swatches of ultra-smooth rich facial creams, silky translucent hydrating jelly serums, refined smooth clay balms and glistening honey balms arranged on pristine studio surface, flawlessly smooth silky textures, no beads, no particles, soft studio lighting with ambient occlusion, 8k commercial photography"
            ]

        # 5. Stage 2 FLUX Negative Prompt (Add anti-granule blocker)
        if nid == 56 and node["type"] == "CLIPTextEncode":
            node["title"] = "🚫 [Stage 2] FLUX 네거티브 프롬프트 (알갱이 차단)"
            node["widgets_values"] = [
                f"{anti_granules_negative}, side view, angled perspective, metal, metallic, plastic, gadget, electronics, blurry, noisy, low quality, distorted, bad reflections, overexposed"
            ]

    with open(wf_path, "w", encoding="utf-8") as f:
        json.dump(wf, f, indent=2, ensure_ascii=False)

    print(f"Updated {wf_path} with anti-granule negative prompts and ultra-smooth positive prompts!")

if __name__ == "__main__":
    remove_scrub_particles()
