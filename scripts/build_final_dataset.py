import os
from PIL import Image

def build_final_dataset():
    ref_dir = "Reference"
    ref01_dir = "Reference_01"
    output_dir = "dataset/cropped_1024"
    os.makedirs(output_dir, exist_ok=True)
    
    # Reference_01 안의 8개 파일을 정렬하여 가져옴
    ref01_files = sorted([f for f in os.listdir(ref01_dir) if f.endswith('.png')])
    
    # 8개 교체 대상 인덱스와 매핑
    replace_indices = [5, 6, 10, 11, 15, 16, 20, 21]
    replace_map = {idx: ref01_files[i] for i, idx in enumerate(replace_indices)}
    
    # 각 이미지별 (x, y, crop_size) - 워터마크 100% 회피 영역 지정
    crops_base = {
        0: (0, 0, 1024),
        1: (80, 0, 750),
        2: (0, 0, 950),
        3: (30, 0, 850),
        4: (0, 0, 1024),
        7: (30, 0, 800),
        8: (0, 0, 1024),
        9: (0, 0, 1024),
        12: (30, 0, 800),
        13: (0, 0, 1024),
        14: (30, 0, 950),
        17: (0, 0, 1024),
        18: (30, 0, 800),
        19: (0, 0, 1024),
        22: (30, 0, 800),
        23: (0, 0, 950),
        24: (0, 0, 1024),
    }
    
    target_size = 1024
    print("25개 전체 데이터셋 정밀 빌드 시작...\n")
    
    for i in range(25):
        out_name = f"image_{i:02d}.png"
        out_path = os.path.join(output_dir, out_name)
        
        if i in replace_map:
            # Reference_01 대체 이미지 사용
            in_file = os.path.join(ref01_dir, replace_map[i])
            with Image.open(in_file) as img:
                img = img.convert("RGB")
                w, h = img.size
                # Reference_01 이미지는 상단 좌측 1024x1024가 깨끗함
                s = min(w, h, target_size)
                cropped = img.crop((0, 0, s, s))
                resized = cropped.resize((target_size, target_size), Image.Resampling.LANCZOS)
                resized.save(out_path, format="PNG", quality=100)
                print(f"[{i:02d}/24] (대체 적용) {replace_map[i]} -> {out_name}")
        else:
            # Reference 기본 이미지 사용
            in_file = os.path.join(ref_dir, f"Reference_{i:02d}.png")
            with Image.open(in_file) as img:
                img = img.convert("RGB")
                w, h = img.size
                x, y, s = crops_base.get(i, (0, 0, min(w, h, target_size)))
                
                x = max(0, min(x, w - s))
                y = max(0, min(y, h - s))
                
                cropped = img.crop((x, y, x + s, y + s))
                resized = cropped.resize((target_size, target_size), Image.Resampling.LANCZOS)
                resized.save(out_path, format="PNG", quality=100)
                print(f"[{i:02d}/24] Reference_{i:02d}.png -> {out_name} (Crop box: x={x}, y={y}, size={s})")

    print(f"\n총 25장 이미지 빌드 완료! 저장 위치: {output_dir}")

if __name__ == "__main__":
    build_final_dataset()
