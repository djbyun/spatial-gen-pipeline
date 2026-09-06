import json

with open("notebooks/Train_Apple_Craft_FLUX_LoRA.ipynb", "r", encoding="utf-8") as f:
    nb = json.load(f)

# Update cell 3
for cell in nb["cells"]:
    if cell["cell_type"] == "code" and any("ai-toolkit" in line for line in cell["source"]):
        cell["source"] = [
            "# 3. FLUX 전용 고속 학습 툴킷(AI-Toolkit) 복제 및 의존성 설치\n",
            "%cd /content\n",
            "!git clone https://github.com/ostris/ai-toolkit.git /content/ai-toolkit\n",
            "%cd /content/ai-toolkit\n",
            "!git submodule update --init --recursive\n",
            "\n",
            "# 필수 패키지 설치\n",
            "!pip install -q torch torchvision --index-url https://download.pytorch.org/whl/cu121\n",
            "!pip install -q -r requirements.txt\n",
            "!pip install -q oyaml diffusers transformers albumentations invisible-watermark bitsandbytes accelerate huggingface_hub"
        ]
        break

# Update cell 7
for cell in nb["cells"]:
    if cell["cell_type"] == "code" and any("run.py" in line for line in cell["source"]):
        cell["source"] = [
            "# 7. FLUX.1-dev LoRA 파인튜닝 실행 (약 15~25분 소요)\n",
            "%cd /content/ai-toolkit\n",
            "!pip install -q oyaml diffusers transformers albumentations\n",
            "!python run.py config/apple_craft_flux.yaml"
        ]
        break

with open("notebooks/Train_Apple_Craft_FLUX_LoRA.ipynb", "w", encoding="utf-8") as f:
    json.dump(nb, f, indent=1, ensure_ascii=False)

print("Updated Train_Apple_Craft_FLUX_LoRA.ipynb successfully!")
