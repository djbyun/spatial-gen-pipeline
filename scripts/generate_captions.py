import os

# 각 이미지(image_00 ~ image_20)의 시각적 특징을 정밀 분석한 캡션 딕셔너리
captions = {
    "image_00": "a photo in apl_minimal_craft style of organic cosmetic cream swirls, viscous pastel orange and beige cosmetic texture, soft studio diffuse lighting, macro close-up view, creamy tactile surface, neutral studio background",
    "image_01": "a photo in apl_minimal_craft style of colorful cosmetic cream swatches, pastel blue, white, yellow and orange creamy textures, smooth strokes, soft diffused studio light, on a soft pink studio background",
    "image_02": "a photo in apl_minimal_craft style of horizontal layered cosmetic cream swatches, beige, blue and white viscous textures, soft shadows, macro photography, on a warm neutral beige background",
    "image_03": "a photo in apl_minimal_craft style of cosmetic texture palette, comb textured yellow cream, textured scrub paste, clear translucent gel droplet, soft studio lighting, on a light yellow background",
    "image_04": "a photo in apl_minimal_craft style of glossy cosmetic cream dollops and crumbly white balm texture, rich viscous fluid, studio overhead lighting, on a vibrant yellow studio background",
    "image_05": "a photo in apl_minimal_craft style of textured coffee exfoliating scrub, terracotta clay and green cosmetic paste, rich granular texture, soft shadows, on a clean white seamless background",
    "image_06": "a photo in apl_minimal_craft style of cosmetic texture palette, glossy pink gel with fine bubbles, white cream swatch, yellow balm, soft studio specular highlights, on a soft pink background",
    "image_07": "a photo in apl_minimal_craft style of thick white cosmetic cream swatch overlapping terracotta clay paste, viscous smooth texture, soft diffuse light, on a neutral paper background",
    "image_08": "a photo in apl_minimal_craft style of rough textured terracotta clay mask swatch, granular earthy texture, sharp edge, soft daylight studio lighting, on a pure white seamless background",
    "image_09": "a photo in apl_minimal_craft style of gold shimmering cosmetic gel and pink cream swatch, glossy metallic particles, smooth curved application, on a soft pink studio background",
    "image_10": "a photo in apl_minimal_craft style of monochrome neutral skin tone cream swirl, elegant curved cosmetic texture, soft studio rim lighting, velvety smooth finish, on a warm beige background",
    "image_11": "a photo in apl_minimal_craft style of yellow textured cosmetic scrub with micro particles and smooth pink cream, comb ridges, directional studio light, on a warm neutral background",
    "image_12": "a photo in apl_minimal_craft style of pastel pink cream stroke with micro granular texture, thick organic application, soft directional shadow, on a soft pink background",
    "image_13": "a photo in apl_minimal_craft style of translucent cosmetic gel dollop and smooth cream swirl, glossy surface reflection, studio high-key lighting, on a bright yellow studio background",
    "image_14": "a photo in apl_minimal_craft style of expressive cosmetic cream brushstroke, yellow, green and pink viscous textures, organic ridges, soft diffused lighting, on a dusty rose pink background",
    "image_15": "a photo in apl_minimal_craft style of thick pearlescent pink cosmetic cream swirl, glossy ribbon curve, soft ambient studio lighting, on a soft pastel pink background",
    "image_16": "a photo in apl_minimal_craft style of decorative pattern of cosmetic cream droplets and swatches, yellow, blue and terracotta creamy balms, clear gel drops, on a warm yellow background",
    "image_17": "a photo in apl_minimal_craft style of organic cosmetic cream palette, white cream, pastel green paste and granular beige scrub, natural daylight, on a neutral grey background",
    "image_18": "a photo in apl_minimal_craft style of cosmetic clay swatches, brown mud mask, pink cream and white lotion textures, tactile surfaces, on a white seamless background",
    "image_19": "a photo in apl_minimal_craft style of soft pastel cosmetic cream swatches, curved application of yellow, pink and orange creams, diffused studio lighting, on a muted rose background",
    "image_20": "a photo in apl_minimal_craft style of vertical 4-tier cosmetic swatches, grey clay, pink cream, terracotta paste and white lotion, clean product sample layout, on a light cream background"
}

def generate_all_captions(output_dir="dataset/cropped_1024"):
    os.makedirs(output_dir, exist_ok=True)
    
    print(f"총 {len(captions)}개 이미지에 대한 정밀 캡션 파일(.txt) 생성을 시작합니다...\n")
    
    for key, text in captions.items():
        txt_path = os.path.join(output_dir, f"{key}.txt")
        with open(txt_path, "w", encoding="utf-8") as f:
            f.write(text.strip())
        print(f"[캡션 생성] {key}.txt -> {text[:60]}...")

    print(f"\n✨ 모든 21개 이미지와 1:1 매칭되는 .txt 캡션 파일 생성이 완료되었습니다!")

if __name__ == "__main__":
    generate_all_captions()
