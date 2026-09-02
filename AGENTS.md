# Spatial Gen Pipeline - Project Context & Agent Memory

## 1. Project Overview
This repository contains the **Apple Minimal Spatial LookDev Generation Pipeline**, an end-to-end framework integrating 3D DCC tools (Houdini), ComfyUI, SDXL LoRA fine-tuning, and multi-pass EXR spatial conditioning.

---

## 2. Directory Architecture & Core Files

### 📁 `3d_guides/`
- Rendered 3D guide passes (EXR/PNG) from Houdini/Maya:
  - `normal.exr` / `depth.exr` / `color_id.exr` / `mask.exr`

### 📁 `comfyui_workflows/`
- Production-ready ComfyUI node graphs for spatial generation:
  - `apple_spatial_lookdev_workflow.json`: Base spatial lookdev pipeline.
  - `apple_spatial_clean_lookdev_workflow.json`: Cleaned-up graph with minimal routing.
  - `apple_spatial_direct_lookdev_workflow.json`: Direct guide pass injection.
  - `apple_spatial_separate_masks_workflow.json`: Multi-mask spatial isolation.
  - `apple_spatial_triple_guide_color_id_workflow.json`: Triple guide conditioning (Depth + Normal + Color ID).
  - `apple_spatial_native_exr_workflow.json`: Native EXR float-buffer loader workflow.

### 📁 `dataset/`
- Curated Apple-style lookdev training set (1024x1024 crops):
  - `dataset/cropped_1024/`: Standard 1024x1024 images & pair `.txt` caption files.
  - `dataset/dataset_captions_summary.md`: Detailed caption breakdown and trigger tokens.
  - `dataset/cropped_backup_all/`: Raw backup dataset before strict deduplication.

### 📁 `docs/`
- `HOUDINI_PASS_EXPORT_GUIDE.md`: Standardized guide on exporting Normal, Depth, Material ID, and AO passes from Houdini Karma/Mantra for ControlNet ingestion.

### 📁 `notebooks/`
- `Train_Apple_Craft_SDXL_LoRA.ipynb`: Training script for SDXL LoRA on Google Colab/Cloud GPU.
- `Apple_Spatial_LookDev_Studio_v2.ipynb` & `Run_Colab_Realtime_Spatial_LookDev.ipynb`: Cloud inference studios.

### 📁 `presentation/`
- Keynote-ready inspection boards, 4x5 curation grids, and horizontal/vertical comparison strips.

### 📁 `scripts/`
- `load_exr.py` & `inspect_and_process_exr.py`: Multi-channel EXR decomposition and color normalization.
- `build_final_dataset.py` & `build_complete_clean_dataset.py`: Automated cropping and metadata alignment.
- `generate_keynote_grid.py` & `generate_horizontal_strip.py`: Asset curation and visual inspection tools.

### 📁 `weights/`
- `apple_minimal_craft_sdxl_v1.safetensors`: Trained SDXL LoRA checkpoint (managed via Git LFS).

---

## 3. Key Design Decisions & Pipeline Rules
1. **Trigger Tokens & Prompting**:
   - Primary style token: `apple minimal craft style`, `clean matte studio lookdev`, `ambient occlusion lighting`.
2. **Spatial Guide Alignment**:
   - Depth and Normal maps must be normalized to standard RGB ranges before ComfyUI ControlNet nodes.
   - EXR channels are mapped dynamically: `N.x, N.y, N.z` to Normal, `Z` or `P.z` to Depth.
3. **Model & VRAM Considerations**:
   - SDXL base model with LoRA rank 32/64.
   - Works across Mac MPS (Apple Silicon), Colab T4/A100, and PC RTX (e.g. RTX 2080 / 3080 / 4090).

---

## 4. Continuity Instructions for Antigravity Agent
When resuming work on PC:
1. Always reference `AGENTS.md` for pipeline structure and naming conventions.
2. Check `docs/HOUDINI_PASS_EXPORT_GUIDE.md` when adjusting 3D passes or node interfaces.
3. ComfyUI workflows in `comfyui_workflows/` are the single source of truth for generation pipelines.
