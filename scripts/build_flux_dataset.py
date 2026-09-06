import os
import sys
import shutil

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

src_dir = "dataset/cropped_1024"
dst_dir = "dataset/flux_train_1024"
os.makedirs(dst_dir, exist_ok=True)

summary_md_lines = [
    "# FLUX.1 [dev] Dataset Captions Summary (21 Items)",
    "Trigger Word: `apple minimal craft style`, `clean matte studio lookdev`",
    "Target Model: FLUX.1-dev (12B MMDiT / T5XXL Text Encoder)",
    "Resolution: 1024x1024",
    "",
    "---",
    ""
]

files = sorted([f for f in os.listdir(src_dir) if f.endswith('.png')])

for f in files:
    base_name = os.path.splitext(f)[0]
    img_src = os.path.join(src_dir, f)
    img_dst = os.path.join(dst_dir, f)
    
    # 1. 이미지 복사
    shutil.copy2(img_src, img_dst)
    
    # 2. SDXL 캡션 읽기
    txt_src = os.path.join(src_dir, f"{base_name}.txt")
    with open(txt_src, "r", encoding="utf-8") as tf:
        caption = tf.read().strip()
        
    # 3. FLUX T5XXL에 최적화된 자연어 풀네임 트리거로 변환
    flux_caption = caption.replace("in apl_minimal_craft style of", "in apple minimal craft style of, clean matte studio lookdev,")
    flux_caption = flux_caption.replace("apl_minimal_craft", "apple minimal craft style")
    
    txt_dst = os.path.join(dst_dir, f"{base_name}.txt")
    with open(txt_dst, "w", encoding="utf-8") as tf:
        tf.write(flux_caption + "\n")
        
    summary_md_lines.append(f"### [{f}]")
    summary_md_lines.append(f"```text\n{flux_caption}\n```\n")
    print(f"[OK] Prepared FLUX pair: {f} + {base_name}.txt")

summary_file = "dataset/flux_captions_summary.md"
with open(summary_file, "w", encoding="utf-8") as sf:
    sf.write("\n".join(summary_md_lines))

print(f"\n[Done] FLUX Dataset Separated Successfully!")
print(f"Folder: {dst_dir}")
print(f"Summary: {summary_file}")
