import os, torch, numpy as np

# Enable OpenEXR in OpenCV
os.environ["OPENCV_IO_ENABLE_OPENEXR"] = "1"
import cv2

class LoadNativeEXR:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "folder_path": ("STRING", {"default": "/content/drive/MyDrive/Generative-Imagery-Systems/apple_lora_project/3d_guides/0000"}),
                "exr_file_name": ("STRING", {"default": "Depth.exr"}),
                "pass_type": (["Depth", "Normal", "Color_ID", "Direct_RGB"], {"default": "Depth"}),
            }
        }

    RETURN_TYPES = ("IMAGE",)
    RETURN_NAMES = ("IMAGE",)
    FUNCTION = "load_and_process_exr"
    CATEGORY = "3D_VFX_Pipeline"

    def load_and_process_exr(self, folder_path, exr_file_name, pass_type):
        full_path = os.path.join(folder_path, exr_file_name)
        if not os.path.exists(full_path):
            # Fallback search if exact name differs
            candidates = [f for f in os.listdir(folder_path) if pass_type.lower() in f.lower() and f.endswith(".exr")]
            if candidates:
                full_path = os.path.join(folder_path, candidates[0])
            else:
                raise FileNotFoundError(f"❌ EXR 파일을 찾을 수 없습니다: {full_path}")

        print(f"📦 [LoadNativeEXR] 32-bit EXR 실시간 로딩: {full_path} (타입: {pass_type})")
        img = cv2.imread(full_path, cv2.IMREAD_UNCHANGED)
        if img is None:
            raise ValueError(f"❌ EXR 파일을 읽을 수 없습니다: {full_path}")

        # 1) Depth Processing
        if pass_type == "Depth":
            d_val = img[:, :, 0] if len(img.shape) == 3 else img
            valid = (d_val > 0.001) & (d_val < 1000.0) & (~np.isnan(d_val)) & (~np.isinf(d_val))
            if np.any(valid):
                d_min, d_max = np.percentile(d_val[valid], 1), np.percentile(d_val[valid], 99)
                norm_d = np.clip((d_val - d_min) / (d_max - d_min + 1e-6), 0.0, 1.0)
                d_norm = (1.0 - norm_d)
                d_norm[~valid] = 0.0
            else:
                d_norm = np.zeros_like(d_val, dtype=np.float32)
            rgb = np.stack([d_norm, d_norm, d_norm], axis=-1)

        # 2) Normal Processing (Camera space -> [0, 1])
        elif pass_type == "Normal":
            rgb = np.clip((img + 1.0) * 0.5, 0.0, 1.0)

        # 3) Color ID / Direct
        else:
            rgb = np.clip(img, 0.0, 1.0)

        # Resize to 1080p if needed
        if rgb.shape[0] != 1080 or rgb.shape[1] != 1920:
            interp = cv2.INTER_NEAREST if pass_type == "Color_ID" else cv2.INTER_LANCZOS4
            rgb = cv2.resize(rgb, (1920, 1080), interpolation=interp)

        # To Torch Tensor [1, H, W, 3]
        tensor = torch.from_numpy(rgb.astype(np.float32)).unsqueeze(0)
        return (tensor,)

NODE_CLASS_MAPPINGS = {
    "LoadNativeEXR": LoadNativeEXR
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "LoadNativeEXR": "📦 Load 3D EXR Pass (Native)"
}
