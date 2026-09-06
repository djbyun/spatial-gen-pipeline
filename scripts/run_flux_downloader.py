import os
import sys
import subprocess
import time

MODELS_BASE = r"C:\Users\DJ\AppData\Local\Comfy-Desktop\ComfyUI-Shared\models"

DOWNLOAD_QUEUE = [
    {
        "name": "ae.safetensors (FLUX VAE - ~335MB)",
        "url": "https://huggingface.co/black-forest-labs/FLUX.1-schnell/resolve/main/ae.safetensors",
        "target": os.path.join(MODELS_BASE, "vae", "ae.safetensors"),
        "min_size": 300 * 1024 * 1024
    },
    {
        "name": "clip_l.safetensors (CLIP-L - ~246MB)",
        "url": "https://huggingface.co/comfyanonymous/flux_text_encoders/resolve/main/clip_l.safetensors",
        "target": os.path.join(MODELS_BASE, "clip", "clip_l.safetensors"),
        "min_size": 200 * 1024 * 1024
    },
    {
        "name": "t5xxl_fp8_e4m3fn.safetensors (T5XXL FP8 - ~4.9GB)",
        "url": "https://huggingface.co/comfyanonymous/flux_text_encoders/resolve/main/t5xxl_fp8_e4m3fn.safetensors",
        "target": os.path.join(MODELS_BASE, "clip", "t5xxl_fp8_e4m3fn.safetensors"),
        "min_size": 4 * 1024 * 1024 * 1024
    },
    {
        "name": "flux1-dev-fp8.safetensors (FLUX.1-dev FP8 UNet - ~11.9GB)",
        "url": "https://huggingface.co/Comfy-Org/flux1-dev/resolve/main/flux1-dev-fp8.safetensors",
        "target": os.path.join(MODELS_BASE, "unet", "flux1-dev-fp8.safetensors"),
        "min_size": 11 * 1024 * 1024 * 1024
    }
]

def download_item(item):
    name = item["name"]
    url = item["url"]
    target = item["target"]
    min_size = item["min_size"]
    
    os.makedirs(os.path.dirname(target), exist_ok=True)
    
    if os.path.exists(target):
        size = os.path.getsize(target)
        if size >= min_size:
            print(f"[EXISTS & VALID] {name} ({size / (1024*1024):.1f} MB) - Skipping.")
            return
        else:
            print(f"[INCOMPLETE] {name} exists ({size / (1024*1024):.1f} MB) - Resuming download...")
            
    print(f"\n=======================================================")
    print(f">> DOWNLOADING: {name}")
    print(f">> DESTINATION: {target}")
    print(f"=======================================================")
    
    temp_target = target + ".part"
    cmd = [
        "curl.exe",
        "-L",
        "-k",
        "--ssl-no-revoke",
        "-A", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "-C", "-",
        "--retry", "5",
        "--retry-delay", "3",
        "-o", temp_target,
        url
    ]
    
    ret = subprocess.run(cmd)
    if ret.returncode != 0:
        raise RuntimeError(f"Failed to download {name}, curl return code: {ret.returncode}")
        
    if os.path.exists(temp_target):
        size = os.path.getsize(temp_target)
        if size >= min_size:
            if os.path.exists(target):
                os.remove(target)
            os.rename(temp_target, target)
            print(f"[SUCCESS] {name} verified and ready ({size / (1024*1024):.1f} MB)!")
        else:
            raise RuntimeError(f"Downloaded file {name} is smaller than expected ({size} bytes).")

def main():
    print(">> Starting High-Speed FLUX.1-dev ComfyUI Asset Downloader")
    print(f">> Target Root: {MODELS_BASE}\n")
    
    for item in DOWNLOAD_QUEUE:
        download_item(item)
        
    print("\n=======================================================")
    print("🎉 ALL 4 ESSENTIAL FLUX.1-DEV MODELS SUCCESSFULLY INSTALLED!")
    print("=======================================================")

if __name__ == "__main__":
    main()
