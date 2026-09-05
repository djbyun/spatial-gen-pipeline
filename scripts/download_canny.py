import os
import sys
import ssl
import urllib.request
import time

urls = [
    "https://hf-mirror.com/diffusers/controlnet-canny-sdxl-1.0/resolve/main/diffusion_pytorch_model.safetensors",
    "https://huggingface.co/diffusers/controlnet-canny-sdxl-1.0/resolve/main/diffusion_pytorch_model.safetensors"
]
dst = r"C:\Users\DJ\AppData\Local\Comfy-Desktop\ComfyUI-Shared\models\controlnet\controlnet-canny-sdxl-1.0.safetensors"
temp_dst = dst + ".part"

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

success = False
for url in urls:
    print(f"Trying URL: {url}")
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    })
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=30) as resp, open(temp_dst, "wb") as f:
            total = int(resp.headers.get("content-length", 0))
            downloaded = 0
            start_time = time.time()
            
            while True:
                chunk = resp.read(1024 * 1024 * 4) # 4MB chunks
                if not chunk:
                    break
                f.write(chunk)
                downloaded += len(chunk)
                
                elapsed = time.time() - start_time
                speed = (downloaded / (1024 * 1024)) / max(elapsed, 0.001)
                
                if total > 0:
                    pct = (downloaded / total) * 100
                    sys.stdout.write(f"\rProgress: {pct:.1f}% ({downloaded // (1024*1024)}MB / {total // (1024*1024)}MB) - {speed:.1f} MB/s")
                    sys.stdout.flush()

        if os.path.exists(dst):
            os.remove(dst)
        os.rename(temp_dst, dst)
        print("\nDownload finished successfully!")
        success = True
        break
    except Exception as e:
        print(f"\nFailed with {url}: {e}")
        if os.path.exists(temp_dst):
            os.remove(temp_dst)

if not success:
    sys.exit(1)
