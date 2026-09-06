# Spatial Gen Pipeline - Project Context & Agent Memory

## 1. Project Overview
This repository contains the **Apple Minimal Spatial LookDev Generation Pipeline**, an end-to-end framework integrating 3D DCC tools (Houdini), ComfyUI, SDXL LoRA fine-tuning, FLUX.1-dev LoRA fine-tuning, and multi-pass EXR spatial conditioning.

---

## 2. Directory Architecture & Core Files

### 📁 `3d_guides/`
- Rendered 3D guide passes (EXR/PNG) from Houdini/Maya:
  - `normal.exr` / `depth.exr` / `color_id.exr` / `mask.exr`
  - `3d_guides/0005/`: `Id.png`, `Mask_01.png` ~ `Mask_06.png`, `Mask_Background.png`

### 📁 `comfyui_workflows/`
- Production-ready ComfyUI node graphs for spatial generation:
  - `apple_spatial_oneshot_regional_workflow.json`: Multi-region material isolation with 3D Depth + Normal control (SDXL Gold Standard).
  - `apple_spatial_oneshot_regional_workflow_no_LoRA.json`: Baseline regional workflow without LoRA.
  - `apple_spatial_minimal_prompt_lora_workflow.json` & `apple_spatial_minimal_prompt_no_lora_workflow.json`: Minimal prompt lookdev graphs.
  - `apple_spatial_triple_exr_workflow.json`: Native multi-channel EXR decomposition workflow.

### 📁 `dataset/`
- Curated Apple-style lookdev training sets (1024x1024 crops):
  - `dataset/cropped_1024/`: **SDXL training set** (21 images & `apl_minimal_craft` captions).
  - `dataset/flux_train_1024/`: **FLUX.1-dev dedicated training set** (21 images & `apple minimal craft style` T5XXL captions).
  - `dataset/dataset_captions_summary.md`: SDXL caption summary.
  - `dataset/flux_captions_summary.md`: FLUX caption summary.
  - `dataset/cropped_1024_dataset.zip` & `dataset/flux_train_1024_dataset.zip`: Packaged zip datasets for Colab.
  - `dataset/cropped_backup_all/`: Raw backup dataset before strict deduplication.

### 📁 `docs/`
- `HOUDINI_PASS_EXPORT_GUIDE.md`: Standardized guide on exporting Normal, Depth, Material ID, and AO passes from Houdini Karma/Mantra for ControlNet ingestion.
- `FLUX_SDXL_SPATIAL_PIPELINE_ARCHITECTURE.md`: Architecture guide and visual diagrams comparing SDXL vs FLUX spatial pipelines and 2-stage hybrid lookdev.

### 📁 `notebooks/`
- `Train_Apple_Craft_SDXL_LoRA.ipynb`: Training script for SDXL LoRA on Google Colab/Cloud GPU.
- `Train_Apple_Craft_FLUX_LoRA.ipynb`: **FLUX.1-dev LoRA training pipeline on Google Colab** (AI-Toolkit, FP8 caching, 8-bit AdamW for T4/L4/A100).
- `Apple_Spatial_LookDev_Studio_v2.ipynb` & `Run_Colab_Realtime_Spatial_LookDev.ipynb`: Cloud inference studios.

### 📁 `presentation/`
- Keynote-ready inspection boards, 4x5 & 7x3 curation grids (`presentation/dataset_curation_7x3_pure_black.png`, `dataset_curation_7x3_dark.png`, `dataset_curation_7x3_light.png`).

### 📁 `scripts/`
- `load_exr.py` & `inspect_and_process_exr.py`: Multi-channel EXR decomposition and color normalization.
- `build_final_dataset.py`, `build_complete_clean_dataset.py` & `build_flux_dataset.py`: Automated cropping, caption conversion, and metadata alignment.
- `bake_comfyui_masks.py`, `inspect_masks.py`: Mask verification and inversion baking.
- `generate_keynote_grid.py`, `generate_grid_7x3_custom.py`: Asset curation and visual inspection tools.

### 📁 `weights/`
- `apple_minimal_craft_sdxl_v1.safetensors`: Trained SDXL LoRA checkpoint (managed via Git LFS).

---

## 3. Local Environment & Model Directory Configuration
- **ComfyUI Desktop (Windows Local) Models Path**:
  - `C:\Users\DJ\AppData\Local\Comfy-Desktop\ComfyUI-Shared\models`
  - Checkpoints: `C:\Users\DJ\AppData\Local\Comfy-Desktop\ComfyUI-Shared\models\checkpoints`
  - ControlNet: `C:\Users\DJ\AppData\Local\Comfy-Desktop\ComfyUI-Shared\models\controlnet`
  - LoRAs: `C:\Users\DJ\AppData\Local\Comfy-Desktop\ComfyUI-Shared\models\loras`
  - Inputs (Guides): `C:\Users\DJ\AppData\Local\Comfy-Desktop\ComfyUI-Shared\input`

---

## 4. Key Design Decisions & Pipeline Rules
1. **Trigger Tokens & Prompting**:
   - SDXL Token: `apl_minimal_craft style`, `clean matte studio lookdev`, `ambient occlusion lighting`.
   - FLUX Token: `apple minimal craft style`, `clean matte studio lookdev`, `ambient occlusion lighting`.
2. **Spatial Guide Alignment**:
   - Depth and Normal maps must be normalized to standard RGB ranges before ComfyUI ControlNet nodes.
   - EXR channels are mapped dynamically: `N.x, N.y, N.z` to Normal, `Z` or `P.z` to Depth.
3. **Model & VRAM Considerations**:
   - SDXL base model with LoRA rank 16/32.
   - FLUX.1-dev with LoRA rank 16 (FP8 quantized training on Colab T4/L4).
   - Works across Mac MPS (Apple Silicon), Colab T4/A100, and PC RTX (e.g. RTX 2080 / 3080 / 4090).

---

## 5. Continuity Instructions for Antigravity Agent
When resuming work on PC:
1. Always reference `AGENTS.md` for pipeline structure and naming conventions.
2. Use the local ComfyUI Desktop models path recorded in Section 3 when managing or syncing weights.
3. Check `docs/HOUDINI_PASS_EXPORT_GUIDE.md` when adjusting 3D passes or node interfaces.
4. ComfyUI workflows in `comfyui_workflows/` are the single source of truth for generation pipelines.

---

## 6. Regional Conditioning & ComfyUI Alpha Mask Rules
1. **ComfyUI LoadImage MASK Channel Behavior**:
   - ComfyUI reads masks as `1.0 - (Alpha / 255.0)`.
   - Any mask PNG fed into `LoadImage` must have the active region set to **Alpha = 0 (Transparent Hole)** and inactive background set to **Alpha = 255 (Opaque)**.
   - Use `scripts/bake_comfyui_masks.py` to auto-bake all guide passes.
2. **ConditioningCombine Binary Tree Topology**:
   - Never chain `ConditioningCombine` in a single serial chain (causes $2^N$ tensor duplication and CFG blowout).
   - Always combine conditionings via balanced binary tree (`[1+2]`, `[3+4]`, `[5+6]`) to keep conditioning tensor count at exact $1:1$ ratio.
3. **Production Gold Standard Workflow**:
   - `apple_spatial_oneshot_regional_workflow.json`: Multi-region material isolation with 3D Depth + Normal control.
