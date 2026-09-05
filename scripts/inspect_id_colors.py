from PIL import Image
import numpy as np

img = Image.open('3d_guides/0005/Id.png').convert('RGB')
arr = np.array(img)
print("Image dimensions:", arr.shape)
colors, counts = np.unique(arr.reshape(-1, 3), axis=0, return_counts=True)
print(f"Total unique color blocks: {len(colors)}")
sorted_indices = np.argsort(-counts)
for idx in sorted_indices[:10]:
    c = colors[idx]
    pct = (counts[idx] / (arr.shape[0] * arr.shape[1])) * 100
    print(f"RGB=({c[0]:3d}, {c[1]:3d}, {c[2]:3d}) - {pct:5.2f}% of pixels")
