import os
from PIL import Image

def replace_problematic_images():
    ref_01_dir = "Reference_01"
    output_dir = "dataset/cropped_1024"
    os.makedirs(output_dir, exist_ok=True)
    
    # 8개 교체 대상 인덱스
    target_indices = [5, 6, 10, 11, 15, 16, 20, 21]
    
    # Reference_01 안의 8개 스크린샷 파일
    files_01 = sorted([f for f in os.listdir(ref_01_dir) if f.endswith('.png')])
    
    print(f"Reference_01에서 {len(files_01)}개 대체 이미지를 로드하여 문제 이미지 {len(target_indices)}개를 교체합니다...")
    
    for idx_target, filename in zip(target_indices, files_01):
        in_path = os.path.join(ref_01_dir, filename)
        out_filename = f"image_{idx_target:02d}.png"
        out_path = os.path.join(output_dir, out_filename)
        
        with Image.open(in_path) as img:
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGBA")
                bg = Image.new("RGB", img.size, (255, 255, 255))
                bg.paste(img, mask=img.split()[3])
                img = bg
            elif img.mode != "RGB":
                img = img.convert("RGB")
                
            w, h = img.size
            
            # Reference_01의 이미지들은 모두 우측/하단에 워터마크가 있으므로
            # 상단-좌측 (x: 0~1024, y: 0~1024)을 1:1로 추출하면 워터마크가 100% 배제됩니다.
            target_size = 1024
            if w >= target_size and h >= target_size:
                left = 0
                top = 0
                cropped = img.crop((left, top, left + target_size, top + target_size))
            else:
                scale = max(target_size / w, target_size / h)
                new_w, new_h = int(w * scale), int(h * scale)
                resized = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
                cropped = resized.crop((0, 0, target_size, target_size))
                
            cropped.save(out_path, format="PNG", quality=100)
            print(f"[교체 완료] {filename} -> {out_filename} (1024x1024 클린 크롭)")

    print(f"\n총 8개 이미지 교체 완료!")

if __name__ == "__main__":
    replace_problematic_images()
