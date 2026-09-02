import os
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

os.environ["OPENCV_IO_ENABLE_OPENEXR"] = "1"

def process_and_visualize():
    depth_path = "3d_guides/Depth.exr"
    normal_path = "3d_guides/Normal.exr"
    
    # 1. Depth 로드 및 처리
    depth_img = cv2.imread(depth_path, cv2.IMREAD_UNCHANGED)
    if depth_img is None:
        raise FileNotFoundError(f"Cannot load {depth_path}")
    
    # 채널 처리 (RGB 또는 싱글 채널)
    if len(depth_img.shape) == 3:
        depth_raw = depth_img[:, :, 0] # R 채널 기준
    else:
        depth_raw = depth_img
        
    # NaN/Inf 처리
    depth_raw = np.nan_to_num(depth_raw, nan=0.0, posinf=1.0, neginf=0.0)
    depth_clipped = np.clip(depth_raw, 0.0, 1.0)
    depth_8bit = (depth_clipped * 255.0).astype(np.uint8)
    
    # Depth PNG 저장
    cv2.imwrite("3d_guides/depth_controlnet_1080p.png", depth_8bit)
    print("✅ Depth ControlNet 맵 저장 완료: 3d_guides/depth_controlnet_1080p.png")

    # 2. Normal 로드 및 처리
    normal_img = cv2.imread(normal_path, cv2.IMREAD_UNCHANGED)
    if normal_img is None:
        raise FileNotFoundError(f"Cannot load {normal_path}")
    
    if len(normal_img.shape) == 3 and normal_img.shape[2] >= 3:
        # OpenCV reads EXR as BGR float
        normal_rgb = cv2.cvtColor(normal_img, cv2.COLOR_BGR2RGB)
    else:
        normal_rgb = normal_img
        
    normal_rgb = np.nan_to_num(normal_rgb, nan=0.0)
    
    # 마스크 감지 (길이가 0이거나 배경인 영역)
    norm_len = np.linalg.norm(normal_rgb, axis=2)
    bg_mask = (norm_len < 0.01) | (depth_raw < 0.01)
    
    # 벡터 [-1, 1] -> [0, 255] 리매핑
    normal_remapped = (normal_rgb + 1.0) * 0.5
    normal_remapped = np.clip(normal_remapped, 0.0, 1.0)
    normal_8bit = (normal_remapped * 255.0).astype(np.uint8)
    
    # 배경을 표준 연보라색 (128, 128, 255)로 처리
    normal_8bit[bg_mask] = [128, 128, 255]
    
    # Normal PNG 저장 (RGB -> BGR for OpenCV imwrite)
    cv2.imwrite("3d_guides/normal_controlnet_1080p.png", cv2.cvtColor(normal_8bit, cv2.COLOR_RGB2BGR))
    print("✅ Normal ControlNet 맵 저장 완료: 3d_guides/normal_controlnet_1080p.png")

    # 3. Keynote 발표용 4K 16:9 비교 검수 보드 제작
    canvas_w = 3840
    canvas_h = 2160
    board = Image.new("RGB", (canvas_w, canvas_h), (18, 18, 20))
    
    # 카드 크기 (16:9 비율 유지)
    card_w = 1600
    card_h = 900
    gap = 120
    
    start_x = (canvas_w - (card_w * 2 + gap)) // 2
    start_y = 650
    
    # Depth 카드
    d_pil = Image.fromarray(depth_8bit).convert("RGB").resize((card_w, card_h), Image.Resampling.LANCZOS)
    board.paste(d_pil, (start_x, start_y))
    
    # Normal 카드
    n_pil = Image.fromarray(normal_8bit).resize((card_w, card_h), Image.Resampling.LANCZOS)
    board.paste(n_pil, (start_x + card_w + gap, start_y))
    
    # 드로잉 및 테두리
    draw = ImageDraw.Draw(board)
    card_radius = 24
    
    # 테두리
    draw.rounded_rectangle((start_x, start_y, start_x + card_w, start_y + card_h), radius=card_radius, outline=(255, 255, 255, 40), width=3)
    draw.rounded_rectangle((start_x + card_w + gap, start_y, start_x + card_w * 2 + gap, start_y + card_h), radius=card_radius, outline=(255, 255, 255, 40), width=3)
    
    # 텍스트 라벨 (Title & Subtitle)
    # Colab/Mac 기본 폰트 사용
    font_title = None
    font_sub = None
    try:
        font_title = ImageFont.truetype("/System/Library/Fonts/SFPro-Bold.otf", 72)
        font_sub = ImageFont.truetype("/System/Library/Fonts/SFPro-Regular.otf", 40)
        font_card = ImageFont.truetype("/System/Library/Fonts/SFPro-Medium.otf", 44)
    except:
        try:
            font_title = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 72)
            font_sub = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 40)
            font_card = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 44)
        except:
            font_title = ImageFont.load_default()
            font_sub = ImageFont.load_default()
            font_card = ImageFont.load_default()
            
    draw.text((start_x, 260), "HOUDINI 3D PROCEDURAL PASSES", fill=(255, 255, 255), font=font_title)
    draw.text((start_x, 370), "Multimodal Spatial Conditioning: Z-Depth (16:9) & Camera Surface Normals", fill=(160, 160, 165), font=font_sub)
    
    draw.text((start_x + 30, start_y - 70), "01. Calibrated Z-Depth AOV (0.2 - 1.0 Remapped)", fill=(240, 240, 245), font=font_card)
    draw.text((start_x + card_w + gap + 30, start_y - 70), "02. Surface Normal AOV (Vector to RGB Space)", fill=(240, 240, 245), font=font_card)
    
    board.save("presentation/spatial_passes_inspection_board.png", format="PNG", quality=100)
    print("✅ Keynote 검수 보드 저장 완료: presentation/spatial_passes_inspection_board.png")

if __name__ == "__main__":
    process_and_visualize()
