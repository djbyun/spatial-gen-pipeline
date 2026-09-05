import os
import sys
from PIL import Image, ImageDraw

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

def create_grid_7x3(
    dataset_dir="dataset/cropped_1024",
    output_dark="presentation/dataset_curation_7x3_grid.png",
    output_light="presentation/dataset_curation_7x3_grid_light.png",
    canvas_w=3840,
    canvas_h=2160,
    rows=3,
    cols=7,
    card_radius=18,
    gap_x=32,
    gap_y=32
):
    os.makedirs("presentation", exist_ok=True)
    
    files = sorted([f for f in os.listdir(dataset_dir) if f.endswith('.png')])
    selected_files = files[:rows * cols]
    
    print(f"Keynote 7x3 Grid Generation (Total {len(selected_files)} images)...")
    
    # 둥근 모서리 마스크 생성
    def get_rounded_corner_mask(size, radius):
        mask = Image.new("L", size, 0)
        draw = ImageDraw.Draw(mask)
        draw.rounded_rectangle((0, 0, size[0], size[1]), radius=radius, fill=255)
        return mask

    # 카드 크기 계산 (정방형)
    margin_x_min = 100
    margin_y_min = 120
    
    avail_w = canvas_w - (margin_x_min * 2) - (cols - 1) * gap_x
    avail_h = canvas_h - (margin_y_min * 2) - (rows - 1) * gap_y
    
    card_size = min(avail_w // cols, avail_h // rows)
    
    total_grid_w = cols * card_size + (cols - 1) * gap_x
    total_grid_h = rows * card_size + (rows - 1) * gap_y
    
    start_x = (canvas_w - total_grid_w) // 2
    start_y = (canvas_h - total_grid_h) // 2
    
    corner_mask = get_rounded_corner_mask((card_size, card_size), card_radius)
    
    processed_cards_dark = []
    processed_cards_light = []
    
    for idx, f in enumerate(selected_files):
        img_path = os.path.join(dataset_dir, f)
        with Image.open(img_path) as img:
            img = img.convert("RGB")
            resized_img = img.resize((card_size, card_size), Image.Resampling.LANCZOS)
            
            # 다크 테마용 카드
            card_dark = Image.new("RGBA", (card_size, card_size), (0, 0, 0, 0))
            card_dark.paste(resized_img, (0, 0))
            card_dark.putalpha(corner_mask)
            draw_d = ImageDraw.Draw(card_dark)
            draw_d.rounded_rectangle(
                (0, 0, card_size - 1, card_size - 1),
                radius=card_radius,
                outline=(255, 255, 255, 35),
                width=2
            )
            processed_cards_dark.append(card_dark)
            
            # 라이트 테마용 카드
            card_light = Image.new("RGBA", (card_size, card_size), (0, 0, 0, 0))
            card_light.paste(resized_img, (0, 0))
            card_light.putalpha(corner_mask)
            draw_l = ImageDraw.Draw(card_light)
            draw_l.rounded_rectangle(
                (0, 0, card_size - 1, card_size - 1),
                radius=card_radius,
                outline=(0, 0, 0, 25),
                width=2
            )
            processed_cards_light.append(card_light)
            print(f"  Processed card {idx+1:02d}/{len(selected_files)}: {f}")
    
    # 1. 다크 테마 캔버스 렌더링
    canvas_dark = Image.new("RGB", (canvas_w, canvas_h), (18, 18, 20))
    for idx, card in enumerate(processed_cards_dark):
        r = idx // cols
        c = idx % cols
        x = start_x + c * (card_size + gap_x)
        y = start_y + r * (card_size + gap_y)
        canvas_dark.paste(card, (x, y), card)
    
    canvas_dark.save(output_dark, format="PNG", quality=100)
    print(f"[Done] Dark 7x3 Grid: {output_dark}")
    
    # 2. 라이트 테마 캔버스 렌더링
    canvas_light = Image.new("RGB", (canvas_w, canvas_h), (245, 245, 247))
    for idx, card in enumerate(processed_cards_light):
        r = idx // cols
        c = idx % cols
        x = start_x + c * (card_size + gap_x)
        y = start_y + r * (card_size + gap_y)
        canvas_light.paste(card, (x, y), card)
        
    canvas_light.save(output_light, format="PNG", quality=100)
    print(f"[Done] Light 7x3 Grid: {output_light}")
    print(f"Card size: {card_size}x{card_size}px, Resolution: 3840x2160 UHD")

if __name__ == "__main__":
    create_grid_7x3()
