import os
from PIL import Image

def crop_and_prepare_dataset(input_dir="Reference", output_dir="dataset/cropped_1024", target_size=1024):
    os.makedirs(output_dir, exist_ok=True)
    
    files = sorted([f for f in os.listdir(input_dir) if f.lower().endswith(('.png', '.jpg', '.jpeg'))])
    
    print(f"총 {len(files)}개의 레퍼런스 이미지를 처리합니다...")
    
    for idx, filename in enumerate(files, start=1):
        in_path = os.path.join(input_dir, filename)
        out_filename = f"image_{idx:02d}.png"
        out_path = os.path.join(output_dir, out_filename)
        
        with Image.open(in_path) as img:
            # RGBA를 RGB로 변환 (알파 채널이 있을 경우 흰색/배경 합성)
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGBA")
                background = Image.new("RGB", img.size, (255, 255, 255))
                background.paste(img, mask=img.split()[3]) # 3 is alpha
                img = background
            elif img.mode != "RGB":
                img = img.convert("RGB")
            
            w, h = img.size
            
            # 크롭 영역 계산 (1024x1024)
            # 하단 워터마크/넘버링을 피하기 위해 Y축은 상단~중상단에 무게를 둠 (top-weighted)
            if w >= target_size and h >= target_size:
                # X축은 중앙 정렬
                left = (w - target_size) // 2
                right = left + target_size
                
                # Y축: 하단 워터마크 회피 (상단에서 약간 내려온 위치 또는 상단 기준)
                # 하단에 여유 공간(워터마크 영역)을 남기기 위해 상단 15% 지점 기준 배치
                available_y = h - target_size
                top = int(available_y * 0.25) # 상단에 가깝게 배치하여 하단 텍스트 배제
                bottom = top + target_size
                
                cropped = img.crop((left, top, right, bottom))
            else:
                # 만약 가로/세로가 1024보다 작은 경우 비율 유지 리사이즈 후 중앙 크롭
                scale = max(target_size / w, target_size / h)
                new_w, new_h = int(w * scale), int(h * scale)
                resized = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
                
                left = (new_w - target_size) // 2
                top = int((new_h - target_size) * 0.25)
                cropped = resized.crop((left, top, left + target_size, top + target_size))
            
            cropped.save(out_path, format="PNG", quality=100)
            print(f"[{idx:02d}/{len(files):02d}] {filename} -> {out_filename} ({target_size}x{target_size}) 저장 완료")

    print(f"\n모든 이미지 전처리가 완료되었습니다. 저장 위치: {output_dir}")

if __name__ == "__main__":
    crop_and_prepare_dataset()
