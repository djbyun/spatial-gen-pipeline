#!/bin/bash
set -e

COMFY_DIR="/Users/dj/Dev/ComfyUI"
CONDA_PY="/Users/dj/miniforge3/envs/comfy/bin/python"
CONDA_PIP="/Users/dj/miniforge3/envs/comfy/bin/pip"
PROJECT_DIR="/Users/dj/Dev/spatial-gen-pipeline"

echo "🍏 [Apple Silicon Metal] ComfyUI 로컬 실행 환경 준비 중..."

# 1. ComfyUI 클론 (없을 경우)
if [ ! -d "$COMFY_DIR" ]; then
    echo "📦 ComfyUI 소스코드 다운로드 중 (/Users/dj/Dev/ComfyUI)..."
    git clone https://github.com/comfyanonymous/ComfyUI.git "$COMFY_DIR"
fi

# 2. 의존성 패키지 설치/업데이트
echo "⚙️ Conda 'comfy' 환경에 의존성 패키지 확인 중..."
"$CONDA_PIP" install -q -r "$COMFY_DIR/requirements.txt"

# 3. LoRA 모델 및 3D 가이드 복사/연결
mkdir -p "$COMFY_DIR/models/loras"
mkdir -p "$COMFY_DIR/models/controlnet"
mkdir -p "$COMFY_DIR/models/checkpoints"
mkdir -p "$COMFY_DIR/input"

echo "🔗 학습된 LoRA 가중치 연동..."
cp -f "$PROJECT_DIR/weights/apple_minimal_craft_sdxl_v1.safetensors" "$COMFY_DIR/models/loras/"

if [ -f "$PROJECT_DIR/3d_guides/depth_controlnet_1080p.png" ]; then
    cp -f "$PROJECT_DIR/3d_guides/depth_controlnet_1080p.png" "$COMFY_DIR/input/"
fi

echo "========================================================"
echo "✅ ComfyUI 로컬 서버를 시작합니다!"
echo "🌐 브라우저에서 [ http://127.0.0.1:8188 ] 로 접속하세요."
echo "========================================================"

cd "$COMFY_DIR"
"$CONDA_PY" main.py --force-fp16 --listen 127.0.0.1 --port 8188
