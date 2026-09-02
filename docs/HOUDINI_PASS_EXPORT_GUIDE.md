# Houdini FLIP Solver & 3D Render Pass Export Guide
## For Generative Spatial Conditioning (ControlNet Depth & Normal)

이 문서는 Houdini에서 FLIP Solver(고점도 크림/젤 시뮬레이션) 결과를 **ControlNet이 100% 픽셀 일치로 인식할 수 있는 Depth Map 및 Camera Normal Map으로 추출하는 표준 파이프라인 가이드**입니다.

---

## 1. Houdini 씬 구성 (FLIP & Look)
1. **FLIP Fluid Solver (Viscous Fluid)**:
   - **Viscosity**: 고점도 설정 (Cream / Clay 룩: Viscosity 500 ~ 5,000)
   - **Particle Separation**: 디테일을 위해 0.005 ~ 0.01 수준으로 메쉬 컨버트 (`Particle Fluid Surface` 노드 사용)
2. **Camera 세팅**:
   - 해상도: **1024 × 1024** (Square 1:1 필수)
   - 화각(Focal Length): 50mm ~ 85mm (과도한 원근 왜곡 방지)

---

## 2. AOV / Render Pass 설정 (Karma / Solaris 기준)

ControlNet은 **0~1 사이로 정규화된 Depth**와 **Camera-space Surface Normal**을 가장 완벽하게 읽어냅니다.

### A. Depth Map (Z-Depth) 설정
- **AOV Name**: `depth` 또는 `Pz`
- **Filter**: 반드시 **`Min` 또는 `Closest`** (가장자리 앤티앨리어싱 블러로 인한 심도 왜곡 방지)
- **COP / Compositing Post-Process**:
  - `Depth Normalize` 노드를 연결하여 카메라 Near Plane (1.0, 흰색)부터 Far Plane (0.0, 검은색) 사이를 **[0.0 ~ 1.0]**으로 매핑.
  - 출력 포맷: **1024×1024 PNG (8-bit 또는 16-bit)**

### B. Surface Normal Map 설정
- **AOV Name**: `N` 또는 `Ncam` (Camera Space Normal)
- **리매핑 공식 (Shader 또는 COP 레벨)**:
  - 3차원 방향 벡터 $[-1.0, 1.0]$ 범위를 RGB 색상 $[0.0, 1.0]$으로 오프셋:
    $$\text{Color}_{\text{RGB}} = 0.5 \times \mathbf{N}_{\text{XYZ}} + 0.5$$
  - **색상 기준**:
    - **R (빨강)**: 표면이 오른쪽을 향함 (+X)
    - **G (초록)**: 표면이 위쪽을 향함 (+Y)
    - **B (파랑)**: 표면이 카메라를 정면으로 바라봄 (+Z)
- 출력 포맷: **1024×1024 PNG**

---

## 3. 파일 저장 규격 (Day 5 ComfyUI 연동용)
Houdini에서 출력된 파일들은 다음 경로에 저장해 두시면 Day 5에서 바로 연결됩니다:

```
spatial-gen-pipeline/
└── 3d_guides/
    ├── houdini_cream_sim_depth.png    # 1024x1024 흑백 Depth
    └── houdini_cream_sim_normal.png   # 1024x1024 RGB Normal
```
