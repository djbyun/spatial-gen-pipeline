import os
import cv2
import numpy as np
from PIL import Image

def process_all_references():
    ref_dir = "Reference"
    output_dir = "dataset/cropped_1024"
    os.makedirs(output_dir, exist_ok=True)
    
    files = sorted([f for f in os.listdir(ref_dir) if f.startswith("Reference_") and f.endswith(".png")])
    target_size = 1024
    
    print(f"총 {len(files)}개 레퍼런스 이미지 크롭 시작...")
    
    for idx, filename in enumerate(files):
        in_path = os.path.join(ref_dir, filename)
        out_filename = f"image_{idx:02d}.png"
        out_path = os.path.join(output_dir, out_filename)
        
        img = Image.open(in_path)
        
        # RGBA -> RGB 변환
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGBA")
            bg = Image.new("RGB", img.size, (255, 255, 255))
            bg.paste(img, mask=img.split()[3])
            img = bg
        elif img.mode != "RGB":
            img = img.convert("RGB")
            
        w, h = img.size
        
        # 크롭 영역 산정:
        # 1) 가로가 넓은 이미지 (w > 1300):
        #    - 워터마크가 주로 우측 하단에 있으므로, X축은 중앙/좌중앙, Y축은 상단 0~1024를 우선 적용
        # 2) 세로가 긴 이미지 / 너비가 1084~1090인 이미지:
        #    - 상단 Y=0부터 1024를 기본으로 하되, 텍스처 중심부 배치
        
        if w >= target_size and h >= target_size:
            # X축 계산
            if w > 1400:
                # 좌측/중앙 쪽으로 약간 오프셋하여 우측 워터마크 영역 배제
                left = int((w - target_size) * 0.35)
            else:
                left = (w - target_size) // 2
                
            right = left + target_size
            
            # Y축 계산: 상단 텍스처 중심으로 최상단 0부터 크롭 (하단 번호/워터마크 배제)
            top = 0
            bottom = target_size
            
            cropped = img.crop((left, top, right, bottom))
        else:
            # 해상도가 1024보다 작은 축이 있을 경우 비율 유지 후 크롭
            scale = max(target_size / w, target_size / h)
            new_w, new_h = int(w * scale), int(h * scale)
            resized = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
            left = (new_w - target_size) // 2
            top = 0
            cropped = resized.crop((left, top, left + target_size, top + target_size))
            
        cropped.save(out_path, format="PNG", quality=100)
        print(f"[{idx:02d}/24] {filename} ({w}x{h}) -> {out_filename} ({target_size}x{target_size}) 저장 완료")

    print(f"\n모든 이미지 전처리가 완료되었습니다. 원본은 그대로 보존되어 있습니다.")

if __name__ == "__main__":
    process_all_references()
