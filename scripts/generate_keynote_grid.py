import os
from PIL import Image, ImageDraw, ImageOps

def create_keynote_grid(
    dataset_dir="dataset/cropped_1024",
    output_path="presentation/dataset_curation_4x5_grid.png",
    canvas_w=3840,
    canvas_h=2160,
    rows=4,
    cols=5,
    bg_color=(18, 18, 20),      # Sleek Apple Dark Keynote theme
    card_radius=20,
    margin_x=160,
    margin_top=140,
    margin_bottom=140,
    gap_x=40,
    gap_y=40
):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    files = sorted([f for f in os.listdir(dataset_dir) if f.endswith('.png')])
    # 4x5 = 20개 이미지 선택 (가장 대표적인 20장)
    selected_files = files[:rows * cols]
    
    print(f"Keynote용 4K 16:9 그리드 생성 중... (총 {len(selected_files)}개 이미지 사용)")
    
    # 1. 4K 캔버스 생성
    canvas = Image.new("RGB", (canvas_w, canvas_h), bg_color)
    
    # 2. 카드 크기 계산
    total_gap_w = (cols - 1) * gap_x
    total_gap_h = (rows - 1) * gap_y
    available_w = canvas_w - (margin_x * 2) - total_gap_w
    available_h = canvas_h - margin_top - margin_bottom - total_gap_h
    
    card_w = available_w // cols
    card_h = available_h // rows
    card_size = min(card_w, card_h) # 정방형 유지
    
    # 실제 그리드 중앙 정렬 오프셋
    grid_total_w = cols * card_size + total_gap_w
    grid_total_h = rows * card_size + total_gap_h
    start_x = (canvas_w - grid_total_w) // 2
    start_y = (canvas_h - grid_total_h) // 2
    
    # 둥근 모서리 마스크 생성 함수
    def get_rounded_corner_mask(size, radius):
        mask = Image.new("L", size, 0)
        draw = ImageDraw.Draw(mask)
        draw.rounded_rectangle((0, 0, size[0], size[1]), radius=radius, fill=255)
        return mask

    corner_mask = get_rounded_corner_mask((card_size, card_size), card_radius)
    
    # 3. 이미지 배치
    for idx, f in enumerate(selected_files):
        r = idx // cols
        c = idx % cols
        
        x = start_x + c * (card_size + gap_x)
        y = start_y + r * (card_size + gap_y)
        
        img_path = os.path.join(dataset_dir, f)
        with Image.open(img_path) as img:
            img = img.convert("RGB")
            resized_img = img.resize((card_size, card_size), Image.Resampling.LANCZOS)
            
            # 둥근 모서리 적용
            card_img = Image.new("RGBA", (card_size, card_size), (0, 0, 0, 0))
            card_img.paste(resized_img, (0, 0))
            card_img.putalpha(corner_mask)
            
            # 은은한 외곽 보더 (Apple 테크니컬 프리미엄 느낌)
            border_draw = ImageDraw.Draw(card_img)
            border_draw.rounded_rectangle(
                (0, 0, card_size-1, card_size-1),
                radius=card_radius,
                outline=(255, 255, 255, 30),
                width=2
            )
            
            # 캔버스에 합성
            canvas.paste(card_img, (x, y), card_img)
            print(f"  [{idx+1:02d}/20] {f} -> 그리드 ({r+1}행, {c+1}열) 배치 완료")
            
    # 4. 저장 (무손실 PNG)
    canvas.save(output_path, format="PNG", quality=100)
    print(f"\n✨ Keynote 슬라이드용 고해상도 그리드 생성 완료!")
    print(f"파일 경로: {output_path} (3840x2160 4K UHD)")

    # 라이트 테마 버전(Apple Minimal White)도 함께 생성
    output_light = "presentation/dataset_curation_4x5_grid_light.png"
    canvas_light = Image.new("RGB", (canvas_w, canvas_h), (245, 245, 247)) # Apple Light Gray
    for idx, f in enumerate(selected_files):
        r = idx // cols
        c = idx % cols
        x = start_x + c * (card_size + gap_x)
        y = start_y + r * (card_size + gap_y)
        with Image.open(os.path.join(dataset_dir, f)) as img:
            img = img.convert("RGB")
            resized_img = img.resize((card_size, card_size), Image.Resampling.LANCZOS)
            card_img = Image.new("RGBA", (card_size, card_size), (0, 0, 0, 0))
            card_img.paste(resized_img, (0, 0))
            card_img.putalpha(corner_mask)
            border_draw = ImageDraw.Draw(card_img)
            border_draw.rounded_rectangle(
                (0, 0, card_size-1, card_size-1),
                radius=card_radius,
                outline=(0, 0, 0, 20),
                width=2
            )
            canvas_light.paste(card_img, (x, y), card_img)
    canvas_light.save(output_light, format="PNG", quality=100)
    print(f"파일 경로: {output_light} (라이트 테마 버전)")

if __name__ == "__main__":
    create_keynote_grid()
