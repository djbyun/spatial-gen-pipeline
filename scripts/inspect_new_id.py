import os
from PIL import Image
import numpy as np

paths = ['3d_guides/0005/Id.png', 'C:/Users/DJ/AppData/Local/Comfy-Desktop/ComfyUI-Shared/input/Id.png']
for p in paths:
    if os.path.exists(p):
        img = np.array(Image.open(p).convert('RGB'))
        colors, counts = np.unique(img.reshape(-1, 3), axis=0, return_counts=True)
        print(f"=== {p} ===")
        for c, count in sorted(zip(colors, counts), key=lambda x: -x[1])[:10]:
            print(f"RGB=({c[0]:3d}, {c[1]:3d}, {c[2]:3d}) Hex=#{c[0]:02x}{c[1]:02x}{c[2]:02x} - {count/len(img.reshape(-1,3))*100:5.2f}%")
