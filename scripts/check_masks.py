from PIL import Image
import numpy as np

for i in range(1, 7):
    path = f'3d_guides/0005/Mask_0{i}.png'
    arr = np.array(Image.open(path))
    r = arr[:, :, 0]
    a = arr[:, :, 3]
    print(f"Mask_0{i}: R channel > 128: {(r > 128).sum()}, Alpha channel > 128: {(a > 128).sum()}")
