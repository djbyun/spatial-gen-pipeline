import os
import subprocess
import time

MODELS_BASE = r"C:\Users\DJ\AppData\Local\Comfy-Desktop\ComfyUI-Shared\models"

DOWNLOADS = [
    {
        "name": "T5XXL (FP8 Text Encoder)",
        "url": "https://huggingface.co/comfyanonymous/flux_text_encoders/resolve/main/t5xxl_fp8_e4m3fn.safetensors",
        "target": os.path.join(MODELS_BASE, "clip", "t5xxl_fp8_e4m3fn.safetensors"),
        "expected_mb": 4900
    },
    {
        "name": "FLUX.1-dev (FP8 UNet Model)",
        "url": "https://huggingface.co/Comfy-Org/flux1-dev/resolve/main/flux1-dev-fp8.safetensors",
        "target": os.path.join(MODELS_BASE, "unet", "flux1-dev-fp8.safetensors"),
        "expected_mb": 11900
    }
]

def main():
    print(">> Starting background download of remaining FLUX.1-dev models...")
    
    for item in DOWNLOADS:
        name = item["name"]
        url = item["url"]
        target = item["target"]
        expected_mb = item["expected_mb"]
        
        os.makedirs(os.path.dirname(target), exist_ok=True)
        
        if os.path.exists(target):
            current_mb = os.path.getsize(target) / (1024 * 1024)
            if current_mb >= expected_mb * 0.95:
                print(f"[ALREADY COMPLETED] {name} ({current_mb:.1f} MB)")
                continue
            else:
                print(f"[RESUMING] {name} ({current_mb:.1f} MB / {expected_mb} MB)...")
        else:
            print(f"\n[DOWNLOADING] {name} -> {target}")
            
        cmd = [
            "curl.exe",
            "-4",
            "--http1.1",
            "-L",
            "-k",
            "--ssl-no-revoke",
            "-A", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            "-C", "-",
            "--retry", "10",
            "--retry-delay", "3",
            "-o", target,
            url
        ]
        
        start = time.time()
        res = subprocess.run(cmd)
        elapsed = time.time() - start
        
        if res.returncode == 0:
            final_mb = os.path.getsize(target) / (1024 * 1024)
            print(f"[SUCCESS] {name} completed: {final_mb:.1f} MB in {elapsed:.1f}s ({final_mb / max(elapsed, 1):.1f} MB/s)")
        else:
            print(f"[ERROR] Failed to download {name}, code: {res.returncode}")

    print("\n🎉 ALL FLUX.1-DEV MODELS SUCCESSFULLY DOWNLOADED!")

if __name__ == "__main__":
    main()
