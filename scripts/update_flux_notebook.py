import json

with open("notebooks/Train_Apple_Craft_FLUX_LoRA.ipynb", "r", encoding="utf-8") as f:
    nb = json.load(f)

for cell in nb["cells"]:
    if cell["cell_type"] == "code" and any("candidate_paths" in line for line in cell["source"]):
        cell["source"] = [
            "# 5. 데이터셋(21장 이미지 + 캡션) 로드 및 배치\n",
            "import os, shutil, zipfile\n",
            "\n",
            "DATASET_DIR = '/content/dataset'\n",
            "os.makedirs(DATASET_DIR, exist_ok=True)\n",
            "\n",
            "# 1) Google Drive에서 FLUX 전용 데이터셋 검색\n",
            "candidate_paths = [\n",
            "    '/content/drive/MyDrive/spatial-gen-pipeline/dataset/flux_train_1024',\n",
            "    '/content/drive/MyDrive/Generative-Imagery-Systems/apple_lora_project/flux_train_1024',\n",
            "    '/content/drive/MyDrive/flux_train_1024',\n",
            "    '/content/drive/MyDrive/spatial-gen-pipeline/dataset/flux_train_1024_dataset.zip',\n",
            "    '/content/drive/MyDrive/flux_train_1024_dataset.zip',\n",
            "    '/content/drive/MyDrive/spatial-gen-pipeline/dataset/cropped_1024',\n",
            "    '/content/drive/MyDrive/cropped_1024'\n",
            "]\n",
            "\n",
            "found_source = None\n",
            "for path in candidate_paths:\n",
            "    if os.path.exists(path):\n",
            "        found_source = path\n",
            "        break\n",
            "\n",
            "# 2) GitHub 레포지토리에서 직접 복제 (드라이브에 없을 경우 자동 Fallback)\n",
            "if not found_source:\n",
            "    print('🌐 GitHub에서 최신 21장 FLUX 전용 데이터셋 직접 다운로드 중...')\n",
            "    !git clone https://github.com/djbyun/spatial-gen-pipeline.git /content/repo_temp\n",
            "    repo_data_dir = '/content/repo_temp/dataset/flux_train_1024'\n",
            "    if os.path.exists(repo_data_dir):\n",
            "        found_source = repo_data_dir\n",
            "    else:\n",
            "        found_source = '/content/repo_temp/dataset/cropped_1024'\n",
            "\n",
            "if found_source:\n",
            "    print(f'📁 데이터셋 소스: {found_source}')\n",
            "    if found_source.endswith('.zip'):\n",
            "        with zipfile.ZipFile(found_source, 'r') as zip_ref:\n",
            "            zip_ref.extractall(DATASET_DIR)\n",
            "        else:\n",
            "            for f in os.listdir(found_source):\n",
            "                if f.endswith('.png') or f.endswith('.txt'):\n",
            "                    shutil.copy2(os.path.join(found_source, f), os.path.join(DATASET_DIR, f))\n",
            "        \n",
            "    img_files = [f for f in os.listdir(DATASET_DIR) if f.endswith('.png')]\n",
            "    txt_files = [f for f in os.listdir(DATASET_DIR) if f.endswith('.txt')]\n",
            "    print(f'✅ FLUX 데이터셋 준비 완료: 이미지 {len(img_files)}장 + 캡션 {len(txt_files)}개')\n",
            "else:\n",
            "    print('⚠️ 데이터셋을 찾을 수 없습니다. 왼쪽 파일 창 /content/dataset 에 직접 업로드해 주세요.')"
        ]

with open("notebooks/Train_Apple_Craft_FLUX_LoRA.ipynb", "w", encoding="utf-8") as f:
    json.dump(nb, f, indent=1, ensure_ascii=False)

print("FLUX notebook updated successfully!")
