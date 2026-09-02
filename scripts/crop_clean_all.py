import os
import cv2
import numpy as np
from PIL import Image

def get_clean_crops():
    """
    각 레퍼런스 이미지의 고유 구도와 워터마크 위치를 분석하여,
    워터마크/텍스트/박스를 100% 회피하면서 가장 질감이 풍부한 영역을 사각형으로 크롭하고 1024x1024로 리사이즈합니다.
    (x, y, size)
    """
    crops = {
        "Reference_00.png": (0, 0, 1024),       # 상단 좌측 (유기적 크림 스와치 집중)
        "Reference_01.png": (80, 0, 750),       # 상단 컬러풀 크림 텍스처
        "Reference_02.png": (0, 0, 950),        # 상단~좌측 텍스처
        "Reference_03.png": (30, 0, 850),       # 상단 크림 스와치
        "Reference_04.png": (0, 0, 1024),       # 상단 좌측
        "Reference_05.png": (0, 0, 1000),       # 상단~좌측 텍스처
        "Reference_06.png": (0, 0, 1000),       # 상단 좌측
        "Reference_07.png": (30, 0, 800),       # 상단 텍스처
        "Reference_08.png": (0, 0, 1024),       # 상단 좌측 (투명 젤+크림)
        "Reference_09.png": (0, 0, 1024),       # 상단 좌측
        "Reference_10.png": (0, 0, 1024),       # 상단 좌측
        "Reference_11.png": (0, 0, 1024),       # 상단 좌측
        "Reference_12.png": (30, 0, 800),       # 상단 크림
        "Reference_13.png": (0, 0, 1024),       # 상단 좌측
        "Reference_14.png": (30, 0, 950),       # 상단 크림
        "Reference_15.png": (0, 0, 1024),       # 상단 좌측
        "Reference_16.png": (0, 0, 1000),       # 상단 좌측
        "Reference_17.png": (0, 0, 1024),       # 상단 좌측
        "Reference_18.png": (30, 0, 800),       # 상단 크림
        "Reference_19.png": (0, 0, 1024),       # 상단 좌측
        "Reference_20.png": (0, 0, 1000),       # 상단 좌측
        "Reference_21.png": (0, 0, 1000),       # 상단 좌측
        "Reference_22.png": (30, 0, 800),       # 상단 크림
        "Reference_23.png": (0, 0, 950),        # 상단 좌측
        "Reference_24.png": (0, 0, 1024),       # 상단 좌측
    }
    return crops

def execute_clean_crops():
    ref_dir = "Reference"
    output_dir = "dataset/cropped_1024"
    os.makedirs(output_dir, exist_ok=True)
    
    crops = get_clean_crops()
    files = sorted([f for f in os.listdir(ref_dir) if f.startswith("Reference_") and f.endswith(".png")])
    
    print(f"총 {len(files)}개 이미지의 워터마크 완전 배제 크롭을 시작합니다...\n")
    
    for idx, f in enumerate(files):
        img_path = os.path.join(ref_dir, f)
        out_name = f"image_{idx:02d}.png"
        out_path = os.path.join(output_dir, out_name)
        
        with Image.open(img_path) as img:
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGBA")
                bg = Image.new("RGB", img.size, (255, 255, 255))
                bg.paste(img, mask=img.split()[3])
                img = bg
            elif img.mode != "RGB":
                img = img.convert("RGB")
                
            w, h = img.size
            x, y, s = crops.get(f, (0, 0, min(w, h, 1024)))
            
            # 바운더리 클램프
            x = max(0, min(x, w - s))
            y = max(0, min(y, h - s))
            
            cropped = img.crop((x, y, x + s, y + s))
            resized = cropped.resize((1024, 1024), Image.Resampling.LANCZOS)
            resized.save(out_path, format="PNG", quality=100)
            
            print(f"[{idx:02d}/24] {f} -> {out_name} (Crop box: x={x}, y={y}, size={s} -> 1024x1024)")

    print(f"\n모든 25개 이미지 크롭 완료! (저장 위치: {output_dir})")

if __name__ == "__main__":
    execute_clean_crops()
