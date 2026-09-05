# 🍏 Apple Spatial LookDev Architecture: SDXL vs FLUX

이 문서는 **Apple Minimal Spatial LookDev Generation Pipeline**의 3D 공간 제어 구조와 SDXL vs FLUX 파이프라인의 차이점, 그리고 2-Stage 하이브리드 워크플로우를 시각화한 아키텍처 가이드입니다.

---

## 1. 파이프라인 구조 비교: SDXL vs FLUX

```mermaid
flowchart TD
    subgraph DCC["3D DCC Layer (Houdini / Maya)"]
        Depth["Z-Depth Pass"]
        Normal["Surface Normal Pass"]
        Masks["Material ID / Multi-Masks"]
    end

    subgraph SDXL_Pipe["1. SDXL 파이프라인 (현재 운영 중)"]
        Depth --> SDXL_CN1["ControlNet (Depth)"]
        Normal --> SDXL_CN2["ControlNet (Normal)"]
        Masks --> SDXL_Mask["ConditioningSetMask\n(바이너리 트리 결합)"]
        
        SDXL_LoRA["SDXL LoRA\n(1024px / 빠른 학습)"] --> SDXL_UNet["SDXL Base U-Net"]
        SDXL_CN1 --> SDXL_UNet
        SDXL_CN2 --> SDXL_UNet
        SDXL_Mask --> SDXL_UNet
        
        SDXL_UNet --> SDXL_Out["결과물\n(3D 기하학 100% 일치 / 2~4초 초고속)"]
    end

    subgraph FLUX_Pipe["2. FLUX 파이프라인 (질감 극대화 차세대 안)"]
        Depth --> FLUX_CN["FLUX ControlNet\n(Depth / Union)"]
        Masks --> FLUX_Fill["FLUX Fill / Inpaint\n(또는 Regional Attention)"]
        
        FLUX_LoRA["FLUX LoRA (12B)\n(Apple CMF 극사실 질감)"] --> FLUX_DiT["FLUX.1-dev MMDiT Engine\n(T5XXL + CLIP-L)"]
        FLUX_CN --> FLUX_DiT
        FLUX_Fill --> FLUX_DiT
        
        FLUX_DiT --> FLUX_Out["최종 결과물\n(상용급 알루미늄/유리 질감 / 극강 포토릴)"]
    end
```

---

## 2. FLUX LoRA 학습 및 3D 공간 제어 엔드투엔드 구조

```mermaid
flowchart LR
    subgraph DataPrep["데이터셋 준비 (공용 재사용)"]
        Raw["21장 Curation 데이터셋\n(dataset/cropped_1024)"]
        Captions["Apple Minimal Trigger Captions\n(dataset_captions_summary.md)"]
    end

    subgraph Training["FLUX LoRA Fine-Tuning (Google Colab)"]
        DataPrep --> AIToolkit["AI-Toolkit (Ostris) / Colab T4"]
        AIToolkit --> FluxDevBase["FLUX.1-dev (12B Base)"]
        FluxDevBase --> ExportLoRA["apple_minimal_craft_flux_v1.safetensors"]
    end

    subgraph ComfyInference["ComfyUI 3D LookDev 생성"]
        ExportLoRA --> ComfyFlux["FLUX UNET Loader + LoRA"]
        HoudiniGuides["3D Guide Passes\n(Depth + 부품 마스크)"] --> ComfyFlux
        PromptEngine["T5XXL Prompt\n(CMF 파츠별 질감 기술)"] --> ComfyFlux
        ComfyFlux --> FinalRender["최종 프리미엄 LookDev 렌더"]
    end
```

---

## 3. 실무 최강 조합: 2-Stage 하이브리드 워크플로우

```mermaid
sequenceDiagram
    autonumber
    actor User as Designer / LookDev TD
    participant Houdini as Houdini 3D DCC
    participant SDXL as Stage 1: SDXL Engine
    participant FLUX as Stage 2: FLUX Engine

    User->>Houdini: Normal, Depth, Mask_01~06 렌더링
    Houdini->>SDXL: 멀티 패스 가이드 주입
    SDXL->>SDXL: Depth+Normal+Masks로 완벽한 기하학 뼈대 생성 (2~3초)
    SDXL->>FLUX: 1차 형태 고정 이미지 전달 (Latent / Img2Img)
    FLUX->>FLUX: FLUX LoRA + Denoise 0.25 (마이크로 알루미늄/빛 반사 입히기)
    FLUX->>User: 최종 Keynote급 4K 룩뎁 완성
```

---

## 4. 모델 아키텍처 및 특성 요약

| 비교 항목 | SDXL 파이프라인 | FLUX 파이프라인 |
| :--- | :--- | :--- |
| **모델 구조** | U-Net + Dual CLIP | 12B Flow Matching Transformer (MMDiT) + T5XXL |
| **3D Normal(법선) 제어** | ⭐⭐⭐⭐⭐ (완벽 & 1:1 일치) | ⭐⭐ (실험적 / 단일 패스 중심) |
| **3D Depth(깊이) 제어** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **부품별 멀티 마스크 제어** | `ConditioningSetMask` 바이너리 트리 | `FLUX Fill` / Regional Attention |
| **재질 묘사력 (CMF & Light)** | ⭐⭐⭐⭐ (LoRA 보조 필요) | ⭐⭐⭐⭐⭐ (초미세 입자감, 포토릴) |
| **LoRA 학습 환경** | Colab 무료 T4 (10분) | Colab T4 / L4 (15~20분, FP8 최적화) |
| **추론 속도** | 장당 2~4초 | 장당 15~25초 |
