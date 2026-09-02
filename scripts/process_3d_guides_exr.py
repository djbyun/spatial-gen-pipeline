#!/usr/bin/env python3
"""
Process 3D Guides EXRs from Houdini (Depth, Normal, Color ID) into ControlNet-ready PNGs.
"""

import os
import sys
import glob
import numpy as np

# Enable OpenEXR
os.environ["OPENCV_IO_ENABLE_OPENEXR"] = "1"
import cv2

def convert_3d_guides(input_dir, output_dir):
    os.makedirs(output_dir, exist_ok=True)
    print(f"🔍 Scanning for EXR files in: {input_dir}")
    
    # 1. Process Depth EXR
    depth_files = glob.glob(os.path.join(input_dir, "*[Dd]epth*.exr"))
    if depth_files:
        d_path = depth_files[0]
        print(f"📦 Processing Depth EXR: {d_path}")
        d_img = cv2.imread(d_path, cv2.IMREAD_UNCHANGED)
        if d_img is not None:
            if len(d_img.shape) == 3:
                d_val = d_img[:, :, 0]
            else:
                d_val = d_img
            
            # Filter background inf/zero
            valid_mask = (d_val > 0.001) & (d_val < 1000.0) & (~np.isnan(d_val)) & (~np.isinf(d_val))
            if np.any(valid_mask):
                d_min = np.percentile(d_val[valid_mask], 1)
                d_max = np.percentile(d_val[valid_mask], 99)
                
                # Invert: Closer = White (255), Farther = Black (0)
                norm_d = np.clip((d_val - d_min) / (d_max - d_min + 1e-6), 0.0, 1.0)
                depth_8bit = (255.0 * (1.0 - norm_d)).astype(np.uint8)
                depth_8bit[~valid_mask] = 0
            else:
                depth_8bit = np.zeros_like(d_val, dtype=np.uint8)
            
            depth_8bit = cv2.resize(depth_8bit, (1920, 1080), interpolation=cv2.INTER_LANCZOS4)
            out_depth = os.path.join(output_dir, "depth_controlnet_1080p.png")
            cv2.imwrite(out_depth, depth_8bit)
            print(f"✅ Depth Map Saved: {out_depth}")

    # 2. Process Normal EXR
    normal_files = glob.glob(os.path.join(input_dir, "*[Nn]ormal*.exr"))
    if normal_files:
        n_path = normal_files[0]
        print(f"📦 Processing Normal EXR: {n_path}")
        n_img = cv2.imread(n_path, cv2.IMREAD_UNCHANGED)
        if n_img is not None:
            if n_img.dtype != np.uint8:
                # Houdini camera space normal: [-1, 1] -> [0, 255] RGB
                norm_n = np.clip((n_img + 1.0) * 0.5, 0.0, 1.0)
                normal_8bit = (norm_n * 255.0).astype(np.uint8)
            else:
                normal_8bit = n_img
            
            normal_8bit = cv2.resize(normal_8bit, (1920, 1080), interpolation=cv2.INTER_LANCZOS4)
            out_normal = os.path.join(output_dir, "normal_controlnet_1080p.png")
            cv2.imwrite(out_normal, normal_8bit)
            print(f"✅ Normal Map Saved: {out_normal}")

    # 3. Process Color ID EXR
    id_files = glob.glob(os.path.join(input_dir, "*[Ii][Dd]*.exr")) + glob.glob(os.path.join(input_dir, "*[Mm]ask*.exr"))
    if id_files:
        id_path = id_files[0]
        print(f"📦 Processing Color ID EXR: {id_path}")
        id_img = cv2.imread(id_path, cv2.IMREAD_UNCHANGED)
        if id_img is not None:
            if id_img.dtype != np.uint8:
                id_8bit = np.clip(id_img * 255.0, 0, 255).astype(np.uint8)
            else:
                id_8bit = id_img
            
            # Nearest neighbor interpolation to keep crisp mask edges
            id_8bit = cv2.resize(id_8bit, (1920, 1080), interpolation=cv2.INTER_NEAREST)
            out_id = os.path.join(output_dir, "color_id_controlnet_1080p.png")
            cv2.imwrite(out_id, id_8bit)
            print(f"✅ Color ID Map Saved: {out_id}")

if __name__ == "__main__":
    in_dir = sys.argv[1] if len(sys.argv) > 1 else "."
    out_dir = sys.argv[2] if len(sys.argv) > 2 else "./processed_guides"
    convert_3d_guides(in_dir, out_dir)
