import os
from PIL import Image

def build_complete_clean_dataset():
    ref_dir = "Reference"
    ref01_dir = "Reference_01"
    output_dir = "dataset/cropped_1024"
    os.makedirs(output_dir, exist_ok=True)
    
    target_size = 1024
    
    # 1. Reference/ 폴더의 기본 25개 이미지별 정밀 클린 크롭 좌표 (x, y, size)
    # 워터마크(우측 하단 Getty, 좌측 하단 숫자)를 100% 회피하는 안전 영역
    crops_ref = {
        0: (0, 0, 1024),
        1: (80, 0, 750),
        2: (0, 0, 950),
        3: (30, 0, 850),
        4: (0, 0, 1024),
        5: (0, 0, 750),
        6: (0, 0, 750),
        7: (30, 0, 800),
        8: (0, 0, 1024),
        9: (0, 0, 1024),
        10: (0, 0, 750),
        11: (0, 0, 750),
        12: (30, 0, 800),
        13: (0, 0, 1024),
        14: (30, 0, 950),
        15: (0, 0, 750),
        16: (0, 0, 750),
        17: (0, 0, 1024),
        18: (30, 0, 800),
        19: (0, 0, 1024),
        20: (0, 0, 750),
        21: (0, 0, 750),
        22: (30, 0, 800),
        23: (0, 0, 950),
        24: (0, 0, 1024),
    }
    
    # 2. Reference_01/ 폴더의 8개 신규 이미지 크롭 (워터마크 회피)
    # Reference_01의 8개 이미지는 상단 좌측 1024x1024가 매우 깨끗함
    
    print("=== 1단계: Reference/ 폴더 25장 처리 ===")
    for i in range(25):
        in_file = os.path.join(ref_dir, f"Reference_{i:02d}.png")
        out_name = f"image_{i:02d}.png"
        out_path = os.path.join(output_dir, out_name)
        
        with Image.open(in_file) as img:
            img = img.convert("RGB")
            w, h = img.size
            x, y, s = crops_ref.get(i, (0, 0, min(w, h, target_size)))
            
            x = max(0, min(x, w - s))
            y = max(0, min(y, h - s))
            
            cropped = img.crop((x, y, x + s, y + s))
            resized = cropped.resize((target_size, target_size), Image.Resampling.LANCZOS)
            resized.save(out_path, format="PNG", quality=100)
            print(f"[{i:02d}] Reference_{i:02d}.png -> {out_name} (Crop: x={x}, y={y}, s={s})")

    print("\n=== 2단계: Reference_01/ 폴더 신규 이미지 추가 (25번 이후 번호 부여) ===")
    ref01_files = sorted([f for f in os.listdir(ref01_dir) if f.endswith('.png')])
    
    start_idx = 25
    for idx, filename in enumerate(ref01_files):
        current_idx = start_idx + idx
        in_file = os.path.join(ref01_dir, filename)
        out_name = f"image_{current_idx:02d}.png"
        out_path = os.path.join(output_dir, out_name)
        
        with Image.open(in_file) as img:
            img = img.convert("RGB")
            w, h = img.size
            # 상단-좌측의 깨끗한 영역 크롭
            s = min(w, h, target_size)
            if w == 1086 and h == 1618: # 4번 파일
                s = 850
                cropped = img.crop((30, 0, 30 + s, s))
            else:
                cropped = img.crop((0, 0, s, s))
                
            resized = cropped.resize((target_size, target_size), Image.Resampling.LANCZOS)
            resized.save(out_path, format="PNG", quality=100)
            print(f"[{current_idx:02d}] (신규 추가) {filename} -> {out_name}")

    total_files = sorted([f for f in os.listdir(output_dir) if f.endswith('.png')])
    print(f"\n총 {len(total_files)}장의 클린 1024x1024 데이터셋이 준비되었습니다. (image_00.png ~ image_{len(total_files)-1:02d}.png)")

if __name__ == "__main__":
    build_complete_clean_dataset()
