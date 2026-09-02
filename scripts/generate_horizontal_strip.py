import os
from PIL import Image, ImageDraw

def create_horizontal_strips(
    dataset_dir="dataset/cropped_1024",
    output_strip_path="presentation/dataset_strip_00_09_1x10.png",
    output_wide_path="presentation/dataset_wide_00_09_2x5.png",
    canvas_w=3840,
    card_radius=16,
):
    os.makedirs("presentation", exist_ok=True)
    
    # 00부터 09까지 10개 파일 선택
    files = [f"image_{i:02d}.png" for i in range(10)]
    print(f"00~09번 10개 이미지를 이용한 와이드/스트립 그리드 생성 중...")
    
    # -------------------------------------------------------------
    # 1. 단일 가로 스트립형 (1행 10열) - 슬라이드 상/하단 와이드 배너용
    # -------------------------------------------------------------
    cols_1x10 = 10
    gap_1x10 = 24
    margin_x_1x10 = 80
    
    card_size_1x10 = (canvas_w - (margin_x_1x10 * 2) - (gap_1x10 * (cols_1x10 - 1))) // cols_1x10
    strip_h = card_size_1x10 + 120 # 상하 여백 포함
    
    # 둥근 모서리 마스크
    mask_1x10 = Image.new("L", (card_size_1x10, card_size_1x10), 0)
    draw_mask_1x10 = ImageDraw.Draw(mask_1x10)
    draw_mask_1x10.rounded_rectangle((0, 0, card_size_1x10, card_size_1x10), radius=card_radius, fill=255)
    
    # 다크 테마 스트립
    canvas_strip_dark = Image.new("RGB", (canvas_w, strip_h), (18, 18, 20))
    # 라이트 테마 스트립
    canvas_strip_light = Image.new("RGB", (canvas_w, strip_h), (245, 245, 247))
    
    start_x_1x10 = margin_x_1x10
    start_y_1x10 = (strip_h - card_size_1x10) // 2
    
    for idx, f in enumerate(files):
        x = start_x_1x10 + idx * (card_size_1x10 + gap_1x10)
        y = start_y_1x10
        
        img_path = os.path.join(dataset_dir, f)
        with Image.open(img_path) as img:
            img = img.convert("RGB")
            resized = img.resize((card_size_1x10, card_size_1x10), Image.Resampling.LANCZOS)
            
            # 카드 생성 (다크용)
            card_d = Image.new("RGBA", (card_size_1x10, card_size_1x10), (0, 0, 0, 0))
            card_d.paste(resized, (0, 0))
            card_d.putalpha(mask_1x10)
            b_d = ImageDraw.Draw(card_d)
            b_d.rounded_rectangle((0, 0, card_size_1x10-1, card_size_1x10-1), radius=card_radius, outline=(255, 255, 255, 35), width=2)
            canvas_strip_dark.paste(card_d, (x, y), card_d)
            
            # 카드 생성 (라이트용)
            card_l = Image.new("RGBA", (card_size_1x10, card_size_1x10), (0, 0, 0, 0))
            card_l.paste(resized, (0, 0))
            card_l.putalpha(mask_1x10)
            b_l = ImageDraw.Draw(card_l)
            b_l.rounded_rectangle((0, 0, card_size_1x10-1, card_size_1x10-1), radius=card_radius, outline=(0, 0, 0, 20), width=2)
            canvas_strip_light.paste(card_l, (x, y), card_l)
            
    canvas_strip_dark.save("presentation/dataset_strip_00_09_1x10.png", format="PNG", quality=100)
    canvas_strip_light.save("presentation/dataset_strip_00_09_1x10_light.png", format="PNG", quality=100)
    print("  -> 1x10 가로 스트립 배너 생성 완료 (다크/라이트)")

    # -------------------------------------------------------------
    # 2. Keynote 16:9 슬라이드용 와이드 2행 5열 (2x5)
    # -------------------------------------------------------------
    canvas_h_16_9 = 2160
    cols_2x5 = 5
    rows_2x5 = 2
    gap_2x5 = 36
    margin_x_2x5 = 240
    
    card_size_2x5 = (canvas_w - (margin_x_2x5 * 2) - (gap_2x5 * (cols_2x5 - 1))) // cols_2x5
    
    grid_total_w_2x5 = cols_2x5 * card_size_2x5 + gap_2x5 * (cols_2x5 - 1)
    grid_total_h_2x5 = rows_2x5 * card_size_2x5 + gap_2x5 * (rows_2x5 - 1)
    start_x_2x5 = (canvas_w - grid_total_w_2x5) // 2
    start_y_2x5 = (canvas_h_16_9 - grid_total_h_2x5) // 2
    
    mask_2x5 = Image.new("L", (card_size_2x5, card_size_2x5), 0)
    draw_mask_2x5 = ImageDraw.Draw(mask_2x5)
    draw_mask_2x5.rounded_rectangle((0, 0, card_size_2x5, card_size_2x5), radius=22, fill=255)
    
    canvas_wide_dark = Image.new("RGB", (canvas_w, canvas_h_16_9), (18, 18, 20))
    canvas_wide_light = Image.new("RGB", (canvas_w, canvas_h_16_9), (245, 245, 247))
    
    for idx, f in enumerate(files):
        r = idx // cols_2x5
        c = idx % cols_2x5
        x = start_x_2x5 + c * (card_size_2x5 + gap_2x5)
        y = start_y_2x5 + r * (card_size_2x5 + gap_2x5)
        
        img_path = os.path.join(dataset_dir, f)
        with Image.open(img_path) as img:
            img = img.convert("RGB")
            resized = img.resize((card_size_2x5, card_size_2x5), Image.Resampling.LANCZOS)
            
            # 다크
            card_d = Image.new("RGBA", (card_size_2x5, card_size_2x5), (0, 0, 0, 0))
            card_d.paste(resized, (0, 0))
            card_d.putalpha(mask_2x5)
            b_d = ImageDraw.Draw(card_d)
            b_d.rounded_rectangle((0, 0, card_size_2x5-1, card_size_2x5-1), radius=22, outline=(255, 255, 255, 35), width=2)
            canvas_wide_dark.paste(card_d, (x, y), card_d)
            
            # 라이트
            card_l = Image.new("RGBA", (card_size_2x5, card_size_2x5), (0, 0, 0, 0))
            card_l.paste(resized, (0, 0))
            card_l.putalpha(mask_2x5)
            b_l = ImageDraw.Draw(card_l)
            b_l.rounded_rectangle((0, 0, card_size_2x5-1, card_size_2x5-1), radius=22, outline=(0, 0, 0, 20), width=2)
            canvas_wide_light.paste(card_l, (x, y), card_l)
            
    canvas_wide_dark.save(output_wide_path, format="PNG", quality=100)
    canvas_wide_light.save("presentation/dataset_wide_00_09_2x5_light.png", format="PNG", quality=100)
    print("  -> 2x5 와이드 16:9 슬라이드 생성 완료 (다크/라이트)")

if __name__ == "__main__":
    create_horizontal_strips()
