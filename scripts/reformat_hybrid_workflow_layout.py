import json

def layout_workflow():
    wf_path = "comfyui_workflows/apple_spatial_hybrid_sdxl_flux_lookdev_workflow.json"
    with open(wf_path, "r", encoding="utf-8") as f:
        wf = json.load(f)

    # Node positions map (generous spacing, no cramping, wires clearly visible)
    # Stage 1 X coordinates:
    # Col 0 (Loaders): X = 50
    # Col 1 (Guides & Prompts): X = 550
    # Col 2 (Mask Set): X = 1100
    # Col 3 (Binary Tree Level 1): X = 1600
    # Col 4 (Binary Tree Level 2): X = 2050
    # Col 5 (Binary Tree Level 3 / ControlNet Apply): X = 2550
    # Col 6 (Stage 1 KSampler & VAE Decode & Preview): X = 3050, 3450, 3750

    # Stage 2 (FLUX) X coordinates:
    # Col 7 (FLUX Core Loaders): X = 4300
    # Col 8 (LoRA & Encoders): X = 4800
    # Col 9 (FLUX Prompts & Guidance & VAE Encode): X = 5350
    # Col 10 (FLUX KSampler): X = 5950
    # Col 11 (FLUX VAE Decode & Final Save): X = 6450, 6800

    positions = {
        # Note
        99: [50, -450],

        # Stage 1 Loaders
        1: [50, 80],     # SDXL Base Loader
        3: [50, 260],    # ControlNet Depth Loader
        5: [50, 420],    # ControlNet Normal Loader

        # Stage 1 3D Guides (Depth, Normal)
        4: [550, 260],   # Depth.png
        6: [550, 540],   # Normal.png

        # Prompts & Masks (Pairs 01~06 + BG)
        # Part 1 (Aluminum Casing)
        7: [550, 820],   # Prompt 01
        8: [550, 1020],  # Mask 01
        9: [1100, 820],  # ConditioningSetMask 01

        # Part 2 (Top Glass)
        10: [550, 1280], # Prompt 02
        11: [550, 1480], # Mask 02
        12: [1100, 1280],# ConditioningSetMask 02

        # Part 3 (Sensors/Lenses)
        13: [550, 1740], # Prompt 03
        14: [550, 1940], # Mask 03
        15: [1100, 1740],# ConditioningSetMask 03

        # Part 4 (Buttons/Accents)
        16: [550, 2200], # Prompt 04
        17: [550, 2400], # Mask 04
        18: [1100, 2200],# ConditioningSetMask 04

        # Part 5 (Display Panel)
        19: [550, 2660], # Prompt 05
        20: [550, 2860], # Mask 05
        21: [1100, 2660],# ConditioningSetMask 05

        # Part 6 (Band/Strap)
        22: [550, 3120], # Prompt 06
        23: [550, 3320], # Mask 06
        24: [1100, 3120],# ConditioningSetMask 06

        # Part 0 (Studio Background)
        25: [550, 3580], # Prompt BG
        26: [550, 3780], # Mask BG
        27: [1100, 3580],# ConditioningSetMask BG

        # Global Negative
        28: [550, 80],   # SDXL Negative Prompt

        # Binary Tree Combine Level 1
        29: [1600, 1050],# Combine [1+2]
        30: [1600, 1970],# Combine [3+4]
        31: [1600, 2890],# Combine [5+6]

        # Binary Tree Combine Level 2
        32: [2050, 1510],# Combine [(1+2) + (3+4)]
        33: [2050, 3230],# Combine [(5+6) + BG]

        # Binary Tree Combine Level 3 (Final Positive)
        34: [2550, 100], # Combine All 7 Parts

        # ControlNet Apply
        35: [2550, 350], # Depth Apply
        36: [2550, 600], # Normal Apply

        # Empty Latent & Stage 1 KSampler
        37: [2550, 850], # EmptyLatentImage
        38: [3050, 80],  # Stage 1 KSampler
        39: [3450, 80],  # Stage 1 VAEDecode
        40: [3750, 80],  # Stage 1 Save/Preview

        # ==========================================
        # STAGE 2 (FLUX.1-dev CMF LookDev Refiner)
        # ==========================================
        # FLUX Core Loaders
        50: [4300, 80],  # UNETLoader (flux1-dev-fp8)
        52: [4300, 240], # DualCLIPLoader (t5xxl + clip_l)
        53: [4300, 420], # VAELoader (ae.safetensors)

        # FLUX LoRA
        51: [4800, 80],  # LoraLoader (apple_minimal_craft_flux_v1)

        # FLUX Prompts & Conditioning
        54: [5300, 80],  # FLUX Positive Prompt
        55: [5750, 80],  # FluxGuidance (3.5)
        56: [5300, 320], # FLUX Negative Prompt

        # Stage 2 VAE Encode (Stage 1 Image -> FLUX Latent)
        57: [5300, 520], # VAEEncode

        # FLUX KSampler
        58: [6100, 80],  # FLUX KSampler (Denoise 0.25)

        # FLUX VAE Decode & Final Output
        59: [6550, 80],  # Final VAEDecode
        60: [6850, 80]   # Final Master SaveImage
    }

    # Apply positions
    for node in wf["nodes"]:
        nid = node["id"]
        if nid in positions:
            node["pos"] = positions[nid]

    # Create Beautiful Colored Groups for Visual Clarity
    groups = [
        {
            "title": "📦 [Stage 1: SDXL Base Loaders & 3D Spatial Passes]",
            "bounding": [20, -50, 1000, 4100],
            "color": "#1e293b",
            "font_size": 24
        },
        {
            "title": "🧩 [Stage 1: 7-Part Regional Masking & Binary Tree Topology]",
            "bounding": [1050, -50, 1900, 4100],
            "color": "#0f172a",
            "font_size": 24
        },
        {
            "title": "⚡ [Stage 1: 3D ControlNet Solvers & Base Render]",
            "bounding": [2500, -50, 1650, 1100],
            "color": "#1e3a5f",
            "font_size": 24
        },
        {
            "title": "🍏 [Stage 2: FLUX.1-dev 12B DiT + Apple Minimal Craft LoRA]",
            "bounding": [4250, -50, 1750, 1100],
            "color": "#064e3b",
            "font_size": 24
        },
        {
            "title": "🏆 [Stage 2: Low-Denoise Neural LookDev & Master Export]",
            "bounding": [6050, -50, 1300, 1100],
            "color": "#1e1b4b",
            "font_size": 24
        }
    ]
    wf["groups"] = groups

    with open(wf_path, "w", encoding="utf-8") as f:
        json.dump(wf, f, indent=2, ensure_ascii=False)

    print("Layout beautified with generous spacing and 5 structured visual groups!")

if __name__ == "__main__":
    layout_workflow()
