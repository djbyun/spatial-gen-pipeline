from PIL import Image
import numpy as np
import glob
import os

masks = sorted(glob.glob('3d_guides/0005/Mask_*.png'))
id_img = np.array(Image.open('3d_guides/0005/Id.png').convert('RGB'))

for m_path in masks:
    m = np.array(Image.open(m_path).convert('L'))
    fg_pixels = m > 128
    count = np.sum(fg_pixels)
    if count > 0:
        mean_rgb = np.mean(id_img[fg_pixels], axis=0).astype(int)
        print(f"{os.path.basename(m_path)}: {count} pixels ({count/(m.shape[0]*m.shape[1])*100:.1f}%) -> Mean ID RGB=({mean_rgb[0]}, {mean_rgb[1]}, {mean_rgb[2]})")
