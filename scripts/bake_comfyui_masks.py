from PIL import Image
import numpy as np
import os

input_dir = 'C:/Users/DJ/AppData/Local/Comfy-Desktop/ComfyUI-Shared/input'
local_dir = '3d_guides/0005'

for i in range(1, 7):
    name = f'Mask_0{i}.png'
    path = os.path.join(local_dir, name)
    # Read mask luminance
    img = Image.open(path).convert('L')
    mask_arr = np.array(img)
    
    # ComfyUI LoadImage reads MASK as: 1.0 - (Alpha / 255.0)
    # To make the mask shape (255) active (1.0), Alpha MUST be 0!
    # To make background (0) inactive (0.0), Alpha MUST be 255!
    alpha_arr = 255 - mask_arr
    
    # Create RGBA image with RGB=White and Alpha=alpha_arr
    h, w = mask_arr.shape
    rgba = np.zeros((h, w, 4), dtype=np.uint8)
    rgba[:, :, 0] = mask_arr # R
    rgba[:, :, 1] = mask_arr # G
    rgba[:, :, 2] = mask_arr # B
    rgba[:, :, 3] = alpha_arr # A (ComfyUI native mask channel)
    
    res_img = Image.fromarray(rgba, 'RGBA')
    res_img.save(path)
    res_img.save(os.path.join(input_dir, name))
    print(f"Baked ComfyUI native Alpha for {name}: Active mask pixels = {(mask_arr > 128).sum()}")

# Background
bg_path = os.path.join(local_dir, 'Mask_Background.png')
if os.path.exists(bg_path):
    bg_img = Image.open(bg_path).convert('L')
    bg_arr = np.array(bg_img)
    h, w = bg_arr.shape
    rgba = np.zeros((h, w, 4), dtype=np.uint8)
    rgba[:, :, 0] = bg_arr
    rgba[:, :, 1] = bg_arr
    rgba[:, :, 2] = bg_arr
    rgba[:, :, 3] = 255 - bg_arr
    res_img = Image.fromarray(rgba, 'RGBA')
    res_img.save(bg_path)
    res_img.save(os.path.join(input_dir, 'Mask_Background.png'))
    print("Baked ComfyUI native Alpha for Mask_Background.png")
