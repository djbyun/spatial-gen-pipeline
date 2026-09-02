import os
from PIL import Image, ImageDraw

def create_vertical_layouts(
    dataset_dir="dataset/cropped_1024",
    card_radius=18,
):
    os.makedirs("presentation", exist_ok=True)
    files = [f"image_{i:02d}.png" for i in range(10)]
    print("00~09번 10개 이미지를 이용한 세로형(Vertical) 레이아웃 생성 중...")

    # -------------------------------------------------------------
    # 1. 단일 세로 스트립형 (10행 1열, 10x1) - 슬라이드 사이드바용
    # -------------------------------------------------------------
    card_size_10x1 = 360
    gap_10x1 = 20
    margin_y_10x1 = 60
    margin_x_10x1 = 60
    
    strip_w = card_size_10x1 + (margin_x_10x1 * 2)
    strip_h = (card_size_10x1 * 10) + (gap_10x1 * 9) + (margin_y_10x1 * 2)
    
    mask_10x1 = Image.new("L", (card_size_10x1, card_size_10x1), 0)
    draw_mask_10x1 = ImageDraw.Draw(mask_10x1)
    draw_mask_10x1.rounded_rectangle((0, 0, card_size_10x1, card_size_10x1), radius=card_radius, fill=255)
    
    canvas_strip_dark = Image.new("RGB", (strip_w, strip_h), (18, 18, 20))
    canvas_strip_light = Image.new("RGB", (strip_w, strip_h), (245, 245, 247))
    
    for idx, f in enumerate(files):
        x = margin_x_10x1
        y = margin_y_10x1 + idx * (card_size_10x1 + gap_10x1)
        
        img_path = os.path.join(dataset_dir, f)
        with Image.open(img_path) as img:
            img = img.convert("RGB")
            resized = img.resize((card_size_10x1, card_size_10x1), Image.Resampling.LANCZOS)
            
            # 다크
            card_d = Image.new("RGBA", (card_size_10x1, card_size_10x1), (0, 0, 0, 0))
            card_d.paste(resized, (0, 0))
            card_d.putalpha(mask_10x1)
            b_d = ImageDraw.Draw(card_d)
            b_d.rounded_rectangle((0, 0, card_size_10x1-1, card_size_10x1-1), radius=card_radius, outline=(255, 255, 255, 35), width=2)
            canvas_strip_dark.paste(card_d, (x, y), card_d)
            
            # 라이트
            card_l = Image.new("RGBA", (card_size_10x1, card_size_10x1), (0, 0, 0, 0))
            card_l.paste(resized, (0, 0))
            card_l.putalpha(mask_10x1)
            b_l = ImageDraw.Draw(card_l)
            b_l.rounded_rectangle((0, 0, card_size_10x1-1, card_size_10x1-1), radius=card_radius, outline=(0, 0, 0, 20), width=2)
            canvas_strip_light.paste(card_l, (x, y), card_l)
            
    canvas_strip_dark.save("presentation/dataset_strip_00_09_10x1_vertical.png", format="PNG", quality=100)
    canvas_strip_light.save("presentation/dataset_strip_00_09_10x1_vertical_light.png", format="PNG", quality=100)
    print("  -> 10x1 단일 세로 스트립 배너 생성 완료 (다크/라이트)")

    # -------------------------------------------------------------
    # 2. 세로 2열형 (5행 2열, 5x2 포트레이트 카드) - 슬라이드 좌/우 패널용
    # -------------------------------------------------------------
    cols_5x2 = 2
    rows_5x2 = 5
    card_size_5x2 = 420
    gap_5x2 = 24
    margin_5x2 = 60
    
    panel_w = (card_size_5x2 * cols_5x2) + (gap_5x2 * (cols_5x2 - 1)) + (margin_5x2 * 2)
    panel_h = (card_size_5x2 * rows_5x2) + (gap_5x2 * (rows_5x2 - 1)) + (margin_5x2 * 2)
    
    mask_5x2 = Image.new("L", (card_size_5x2, card_size_5x2), 0)
    draw_mask_5x2 = ImageDraw.Draw(mask_5x2)
    draw_mask_5x2.rounded_rectangle((0, 0, card_size_5x2, card_size_5x2), radius=card_radius, fill=255)
    
    canvas_panel_dark = Image.new("RGB", (panel_w, panel_h), (18, 18, 20))
    canvas_panel_light = Image.new("RGB", (panel_w, panel_h), (245, 245, 247))
    
    for idx, f in enumerate(files):
        r = idx // cols_5x2
        c = idx % cols_5x2
        x = margin_5x2 + c * (card_size_5x2 + gap_5x2)
        y = margin_5x2 + r * (card_size_5x2 + gap_5x2)
        
        img_path = os.path.join(dataset_dir, f)
        with Image.open(img_path) as img:
            img = img.convert("RGB")
            resized = img.resize((card_size_5x2, card_size_5x2), Image.Resampling.LANCZOS)
            
            # 다크
            card_d = Image.new("RGBA", (card_size_5x2, card_size_5x2), (0, 0, 0, 0))
            card_d.paste(resized, (0, 0))
            card_d.putalpha(mask_5x2)
            b_d = ImageDraw.Draw(card_d)
            b_d.rounded_rectangle((0, 0, card_size_5x2-1, card_size_5x2-1), radius=card_radius, outline=(255, 255, 255, 35), width=2)
            canvas_panel_dark.paste(card_d, (x, y), card_d)
            
            # 라이트
            card_l = Image.new("RGBA", (card_size_5x2, card_size_5x2), (0, 0, 0, 0))
            card_l.paste(resized, (0, 0))
            card_l.putalpha(mask_5x2)
            b_l = ImageDraw.Draw(card_l)
            b_l.rounded_rectangle((0, 0, card_size_5x2-1, card_size_5x2-1), radius=card_radius, outline=(0, 0, 0, 20), width=2)
            canvas_panel_light.paste(card_l, (x, y), card_l)
            
    canvas_panel_dark.save("presentation/dataset_panel_00_09_5x2_vertical.png", format="PNG", quality=100)
    canvas_panel_light.save("presentation/dataset_panel_00_09_5x2_vertical_light.png", format="PNG", quality=100)
    print("  -> 5x2 세로 패널 생성 완료 (다크/라이트)")

if __name__ == "__main__":
    create_vertical_layouts()
