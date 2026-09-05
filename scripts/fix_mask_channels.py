from PIL import Image
import os

input_dir = 'C:/Users/DJ/AppData/Local/Comfy-Desktop/ComfyUI-Shared/input'
local_dir = '3d_guides/0005'

for i in range(1, 7):
    name = f'Mask_0{i}.png'
    path = os.path.join(local_dir, name)
    # Convert RGB/RGBA to Grayscale based on RGB brightness (where R > 128 is 255, else 0)
    img = Image.open(path).convert('RGB')
    gray = img.convert('L')
    
    # Save as clean 1-channel Grayscale PNG (no opaque alpha channel)
    gray.save(path)
    gray.save(os.path.join(input_dir, name))
    print(f"Fixed {name} -> Grayscale L-mode (white pixels: {(np.array(gray) > 128).sum() if 'np' in globals() else 'saved'})")

# Background mask
bg_path = os.path.join(local_dir, 'Mask_Background.png')
if os.path.exists(bg_path):
    bg_img = Image.open(bg_path).convert('L')
    bg_img.save(bg_path)
    bg_img.save(os.path.join(input_dir, 'Mask_Background.png'))
    print("Fixed Mask_Background.png -> Grayscale L-mode")
