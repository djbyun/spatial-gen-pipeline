import os
import sys
import time
import urllib.request

# Ensure UTF-8 output on Windows
if sys.platform.startswith('win'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

MODELS_BASE = r"C:\Users\DJ\AppData\Local\Comfy-Desktop\ComfyUI-Shared\models"

DOWNLOADS = [
    {
        "name": "ae.safetensors (FLUX VAE)",
        "url": "https://huggingface.co/Kijai/flux-fp8/resolve/main/ae.safetensors",
        "target": os.path.join(MODELS_BASE, "vae", "ae.safetensors"),
        "expected_size_mb": 335
    },
    {
        "name": "clip_l.safetensors (CLIP-L)",
        "url": "https://huggingface.co/comfyanonymous/flux_text_encoders/resolve/main/clip_l.safetensors",
        "target": os.path.join(MODELS_BASE, "clip", "clip_l.safetensors"),
        "expected_size_mb": 246
    },
    {
        "name": "t5xxl_fp8_e4m3fn.safetensors (T5XXL FP8)",
        "url": "https://huggingface.co/comfyanonymous/flux_text_encoders/resolve/main/t5xxl_fp8_e4m3fn.safetensors",
        "target": os.path.join(MODELS_BASE, "clip", "t5xxl_fp8_e4m3fn.safetensors"),
        "expected_size_mb": 4900
    },
    {
        "name": "flux1-dev-fp8.safetensors (FLUX.1-dev FP8 UNet)",
        "url": "https://huggingface.co/Kijai/flux-fp8/resolve/main/flux1-dev-fp8.safetensors",
        "target": os.path.join(MODELS_BASE, "unet", "flux1-dev-fp8.safetensors"),
        "expected_size_mb": 11900
    }
]

def download_file(url, target_path, name):
    os.makedirs(os.path.dirname(target_path), exist_ok=True)
    
    if os.path.exists(target_path):
        current_size = os.path.getsize(target_path)
        print(f"[{name}] Already exists: {target_path} ({current_size / (1024*1024):.1f} MB)", flush=True)
        if current_size > 10 * 1024 * 1024:
            print(f"  -> Skipping existing file.", flush=True)
            return

    print(f"\n=======================================================", flush=True)
    print(f">> Starting download: {name}", flush=True)
    print(f">> URL: {url}", flush=True)
    print(f">> Target: {target_path}", flush=True)
    print(f"=======================================================", flush=True)

    temp_path = target_path + ".downloading"
    
    opener = urllib.request.build_opener()
    opener.addheaders = [('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)')]
    urllib.request.install_opener(opener)

    start_time = time.time()
    last_print = start_time
    
    def reporthook(block_num, block_size, total_size):
        nonlocal last_print
        current_time = time.time()
        downloaded = block_num * block_size
        if current_time - last_print > 5.0 or (total_size > 0 and downloaded >= total_size):
            last_print = current_time
            elapsed = max(current_time - start_time, 0.001)
            speed_mb = (downloaded / (1024 * 1024)) / elapsed
            if total_size > 0:
                percent = min(100.0, (downloaded / total_size) * 100.0)
                print(f"  Progress: {percent:.1f}% ({downloaded / (1024*1024):.1f} / {total_size / (1024*1024):.1f} MB) - {speed_mb:.1f} MB/s", flush=True)
            else:
                print(f"  Progress: {downloaded / (1024*1024):.1f} MB downloaded - {speed_mb:.1f} MB/s", flush=True)

    try:
        urllib.request.urlretrieve(url, temp_path, reporthook=reporthook)
        if os.path.exists(target_path):
            os.remove(target_path)
        os.rename(temp_path, target_path)
        total_time = time.time() - start_time
        final_size_mb = os.path.getsize(target_path) / (1024 * 1024)
        print(f"[OK] Successfully downloaded {name} ({final_size_mb:.1f} MB) in {total_time:.1f}s", flush=True)
    except Exception as e:
        print(f"[ERROR] Error downloading {name}: {e}", flush=True)
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except:
                pass
        raise e

def main():
    print(f">> FLUX.1-dev (FP8) ComfyUI Model Downloader", flush=True)
    print(f">> Target directory: {MODELS_BASE}\n", flush=True)
    
    for item in DOWNLOADS:
        download_file(item["url"], item["target"], item["name"])
        
    print("\n>> ALL FLUX.1-dev FP8 MODELS SUCCESSFULLY DOWNLOADED AND INSTALLED!", flush=True)

if __name__ == "__main__":
    main()
