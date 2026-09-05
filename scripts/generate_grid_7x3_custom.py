import os
import sys
from PIL import Image, ImageDraw

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

def get_rounded_corner_mask(size, radius):
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, size[0], size[1]), radius=radius, fill=255)
    return mask

def generate_perfect_uniform_grids(dataset_dir="dataset/cropped_1024"):
    os.makedirs("presentation", exist_ok=True)
    
    files = sorted([f for f in os.listdir(dataset_dir) if f.endswith('.png')])
    selected_files = files[:21]  # 7x3 = 21
    
    cols = 7
    rows = 3
    
    # -------------------------------------------------------------
    # 상하좌우 모든 외곽 여백(에지) = 카드 사이 간격(Gap)의 2배로 완벽 통일
    # -------------------------------------------------------------
    gap = 32
    margin = 2 * gap  # 64px (상, 하, 좌, 우 모두 정확히 64px)
    card_radius = 18
    card_size = 502   # 선명한 고해상도 502x502px 카드
    
    # 캔버스 크기: 7개 열 + 여백 / 3개 행 + 여백
    # 가로: 7 * 502 + 6 * 32 + 2 * 64 = 3514 + 192 + 128 = 3834 px (~4K 너비)
    # 세로: 3 * 502 + 2 * 32 + 2 * 64 = 1506 + 64 + 128 = 1698 px (위아래 여백 과다 문제 완벽 해결!)
    canvas_w = cols * card_size + (cols - 1) * gap + (2 * margin)
    canvas_h = rows * card_size + (rows - 1) * gap + (2 * margin)
    
    corner_mask = get_rounded_corner_mask((card_size, card_size), card_radius)
    
    print("==================================================")
    print("✨ 상하좌우 완벽 균일 에지 (Margin = 2x Gap = 64px) 그리드 생성")
    print(f"• 카드 크기: {card_size} x {card_size} px")
    print(f"• 카드 간격(Gap): {gap} px")
    print(f"• 상/하/좌/우 모든 외곽 에지(Margin): {margin} px (위아래 낭비 공간 0)")
    print(f"• 최종 캔버스 해상도: {canvas_w} x {canvas_h} px")
    print("==================================================")
    
    # 사전 렌더링 카드 준비
    cards_pure_black = []
    cards_dark = []
    cards_light = []
    
    for idx, f in enumerate(selected_files):
        img_path = os.path.join(dataset_dir, f)
        with Image.open(img_path) as img:
            img_res = img.convert("RGB").resize((card_size, card_size), Image.Resampling.LANCZOS)
            
            # Pure Black 카드
            card_pb = Image.new("RGBA", (card_size, card_size), (0, 0, 0, 0))
            card_pb.paste(img_res, (0, 0))
            card_pb.putalpha(corner_mask)
            draw_pb = ImageDraw.Draw(card_pb)
            draw_pb.rounded_rectangle(
                (0, 0, card_size - 1, card_size - 1),
                radius=card_radius,
                outline=(255, 255, 255, 45),
                width=2
            )
            cards_pure_black.append(card_pb)
            
            # Apple Dark 카드
            card_d = Image.new("RGBA", (card_size, card_size), (0, 0, 0, 0))
            card_d.paste(img_res, (0, 0))
            card_d.putalpha(corner_mask)
            draw_d = ImageDraw.Draw(card_d)
            draw_d.rounded_rectangle(
                (0, 0, card_size - 1, card_size - 1),
                radius=card_radius,
                outline=(255, 255, 255, 35),
                width=2
            )
            cards_dark.append(card_d)
            
            # Apple Light 카드
            card_l = Image.new("RGBA", (card_size, card_size), (0, 0, 0, 0))
            card_l.paste(img_res, (0, 0))
            card_l.putalpha(corner_mask)
            draw_l = ImageDraw.Draw(card_l)
            draw_l.rounded_rectangle(
                (0, 0, card_size - 1, card_size - 1),
                radius=card_radius,
                outline=(0, 0, 0, 25),
                width=2
            )
            cards_light.append(card_l)

    # 테마별 렌더링 및 저장
    tasks = [
        ("Pure Black (#000000)", (0, 0, 0), cards_pure_black, "presentation/dataset_curation_7x3_pure_black.png"),
        ("Apple Dark (#121214)", (18, 18, 20), cards_dark, "presentation/dataset_curation_7x3_dark.png"),
        ("Apple Light (#F5F5F7)", (245, 245, 247), cards_light, "presentation/dataset_curation_7x3_light.png"),
    ]
    
    for theme_name, bg_color, card_list, out_path in tasks:
        canvas = Image.new("RGB", (canvas_w, canvas_h), bg_color)
        for idx, card in enumerate(card_list):
            r = idx // cols
            c = idx % cols
            x = margin + c * (card_size + gap)
            y = margin + r * (card_size + gap)
            canvas.paste(card, (x, y), card)
            
        canvas.save(out_path, format="PNG", quality=100)
        print(f"✅ [{theme_name}] 저장 완료: {out_path}")

if __name__ == "__main__":
    generate_perfect_uniform_grids()
