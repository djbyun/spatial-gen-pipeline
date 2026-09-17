import os
import sys
import shutil

# Ensure UTF-8 output on Windows
if sys.platform.startswith('win'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

GUIDES_ROOT = r"D:\Dev\spatial-gen-pipeline\3d_guides"
COMFY_INPUT = r"C:\Users\DJ\AppData\Local\Comfy-Desktop\ComfyUI-Shared\input"

def get_available_shots():
    shots = []
    if os.path.exists(GUIDES_ROOT):
        for item in sorted(os.listdir(GUIDES_ROOT)):
            full = os.path.join(GUIDES_ROOT, item)
            if os.path.isdir(full) and item.isdigit():
                shots.append(item)
    return shots

def select_and_deploy_shot(shot_num_str):
    if shot_num_str.isdigit():
        shot_key = f"{int(shot_num_str):04d}"
    else:
        shot_key = shot_num_str

    src_dir = os.path.join(GUIDES_ROOT, shot_key)
    if not os.path.exists(src_dir):
        print(f"[ERROR] Shot '{shot_key}' folder not found at: {src_dir}")
        return False

    os.makedirs(COMFY_INPUT, exist_ok=True)

    copied = []
    for f in os.listdir(src_dir):
        if f.endswith(".png") or f.endswith(".jpg") or f.endswith(".exr"):
            src_file = os.path.join(src_dir, f)
            dst_file = os.path.join(COMFY_INPUT, f)
            shutil.copy2(src_file, dst_file)
            copied.append(f)

    mb = os.path.join(COMFY_INPUT, "Mask_Background.png")
    if os.path.exists(mb):
        try:
            os.remove(mb)
        except Exception:
            pass

    print("\n" + "="*60)
    print(f">> [Shot {shot_key}] Successfully Deployed to ComfyUI!")
    print(f">> Source: {src_dir}")
    print(f">> Target: {COMFY_INPUT}")
    print(f">> Active Passes ({len(copied)} files):")
    for item in sorted(copied):
        print(f"   • {item}")
    print("="*60)
    print(f">> ComfyUI에서 'Queue Prompt'를 누르면 바로 [Shot {shot_key}]로 렌더링됩니다!\n")
    return True

def interactive_mode():
    shots = get_available_shots()
    if not shots:
        print("[ERROR] No 3d_guides shot folders found.")
        return

    print("="*60)
    print(">> 3D Guide Shot Selector (0001 ~ 0100)")
    print("="*60)
    print(f"총 {len(shots)}개의 샷이 준비되어 있습니다 ({shots[0]} ~ {shots[-1]}).")
    print("선택하고 싶은 샷 번호를 입력하세요 (예: 1, 5, 85, 100) / 종료: q")
    
    while True:
        try:
            val = input("\n>> 샷 번호 입력: ").strip()
            if not val:
                continue
            if val.lower() in ["q", "exit", "quit"]:
                break
            select_and_deploy_shot(val)
        except (KeyboardInterrupt, EOFError):
            break

def main():
    if len(sys.argv) > 1:
        shot_arg = sys.argv[1]
        select_and_deploy_shot(shot_arg)
    else:
        interactive_mode()

if __name__ == "__main__":
    main()
