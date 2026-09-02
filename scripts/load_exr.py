import os, glob, torch, numpy as np
os.environ["OPENCV_IO_ENABLE_OPENEXR"] = "1"
import cv2

def read_image_universal(full_path):
    img = None
    # 1. OpenCV
    try:
        img = cv2.imread(full_path, cv2.IMREAD_UNCHANGED)
    except Exception:
        pass

    # 2. imageio (Linux 32-bit Float EXR)
    if img is None:
        try:
            import imageio.v3 as iio
            img = iio.imread(full_path)
            if img is not None and len(img.shape) == 3 and img.shape[-1] >= 3:
                img = img[:, :, [2, 1, 0] + list(range(3, img.shape[-1]))]
        except Exception:
            pass

    # 3. OpenEXR
    if img is None and full_path.lower().endswith('.exr'):
        try:
            import OpenEXR, Imath
            exr = OpenEXR.InputFile(full_path)
            header = exr.header()
            dw = header['dataWindow']
            w = dw.max.x - dw.min.x + 1
            h = dw.max.y - dw.min.y + 1
            pt = Imath.PixelType(Imath.PixelType.FLOAT)
            channels = list(header['channels'].keys())
            
            if 'Z' in channels or 'depth' in channels or 'Y' in channels:
                ch = 'Z' if 'Z' in channels else ('depth' if 'depth' in channels else 'Y')
                img = np.frombuffer(exr.channel(ch, pt), dtype=np.float32).reshape((h, w))
            elif 'R' in channels and 'G' in channels and 'B' in channels:
                r = np.frombuffer(exr.channel('R', pt), dtype=np.float32).reshape((h, w))
                g = np.frombuffer(exr.channel('G', pt), dtype=np.float32).reshape((h, w))
                b = np.frombuffer(exr.channel('B', pt), dtype=np.float32).reshape((h, w))
                img = np.stack([b, g, r], axis=-1)
        except Exception:
            pass

    # 4. PIL
    if img is None:
        try:
            from PIL import Image
            img = np.array(Image.open(full_path))
        except Exception:
            pass

    return img


class LoadNativeEXR:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "folder_path": ("STRING", {"default": "/content/drive/MyDrive/Generative-Imagery-Systems/apple_lora_project/3d_guides/0010", "multiline": False}),
                "exr_file_name": ("STRING", {"default": "Depth.exr", "multiline": False}),
                "pass_type": (["Depth", "Normal", "Color_ID", "Direct_RGB"], {"default": "Depth"}),
            }
        }

    RETURN_TYPES = ("IMAGE",)
    RETURN_NAMES = ("IMAGE",)
    FUNCTION = "load_and_process_exr"
    CATEGORY = "3D_VFX_Pipeline"

    @classmethod
    def IS_CHANGED(s, folder_path, exr_file_name, pass_type):
        target_dir = folder_path.strip()
        target_file = exr_file_name.strip()
        full_path = os.path.join(target_dir, target_file)
        if os.path.exists(full_path):
            return os.path.getmtime(full_path)
        return float("nan")

    def load_and_process_exr(self, folder_path, exr_file_name, pass_type):
        target_dir = folder_path.strip()
        if not os.path.exists(target_dir):
            base_search = os.path.basename(target_dir) if os.path.basename(target_dir) else "0010"
            found_folders = glob.glob(f"/content/drive/MyDrive/**/{base_search}", recursive=True)
            if found_folders:
                target_dir = found_folders[0]

        target_file = exr_file_name.strip()
        full_path = os.path.join(target_dir, target_file)
        
        # Case-insensitive and extension fallback
        if not os.path.exists(full_path) and os.path.exists(target_dir):
            all_files = [f for f in os.listdir(target_dir) if f.lower().endswith(('.png', '.exr', '.jpg', '.jpeg'))]
            matched = [f for f in all_files if pass_type.lower() in f.lower() or os.path.splitext(target_file)[0].lower() in f.lower()]
            if matched:
                full_path = os.path.join(target_dir, matched[0])

        if not os.path.exists(full_path):
            files_found = os.listdir(target_dir) if os.path.exists(target_dir) else "폴더 없음"
            raise FileNotFoundError(f"❌ 파일을 찾을 수 없습니다: {full_path}\n(폴더 내 실제 파일: {files_found})")

        img = read_image_universal(full_path)
        if img is None:
            raise ValueError(f"❌ 파일 디코딩 실패 ({full_path}) - 파일 포맷을 확인하세요.")

        is_png = full_path.lower().endswith('.png') or full_path.lower().endswith('.jpg')

        if pass_type == "Depth":
            d_raw = (img[:, :, 0] if len(img.shape) == 3 else img).astype(np.float32)
            if is_png or img.dtype == np.uint8:
                d_raw = d_raw / 255.0
            else:
                valid = (d_raw > 0.0001) & (d_raw < 10000.0) & (~np.isnan(d_raw)) & (~np.isinf(d_raw))
                if np.any(valid):
                    d_min, d_max = float(np.percentile(d_raw[valid], 1)), float(np.percentile(d_raw[valid], 99))
                    if d_max > d_min:
                        d_norm = np.clip((d_raw - d_min) / (d_max - d_min + 1e-6), 0.0, 1.0)
                        d_raw = 1.0 - d_norm
                        d_raw[~valid] = 0.0
                    else:
                        d_raw = np.zeros_like(d_raw)
                else:
                    d_raw = np.zeros_like(d_raw)
            rgb = np.stack([d_raw, d_raw, d_raw], axis=-1)
        elif pass_type == "Normal":
            if is_png or img.dtype == np.uint8:
                rgb = img.astype(np.float32) / 255.0
            else:
                rgb = np.clip((img + 1.0) * 0.5, 0.0, 1.0)
            if len(rgb.shape) == 3 and rgb.shape[-1] >= 3:
                rgb = rgb[:, :, [2, 1, 0]]
        else:
            if is_png or img.dtype == np.uint8:
                rgb = img.astype(np.float32) / 255.0
                if len(rgb.shape) == 3 and rgb.shape[-1] >= 3:
                    rgb = rgb[:, :, [2, 1, 0]]
            else:
                rgb = np.clip(img, 0.0, 1.0)

        if len(rgb.shape) == 2:
            rgb = np.stack([rgb, rgb, rgb], axis=-1)
        elif len(rgb.shape) == 3:
            if rgb.shape[-1] == 1:
                rgb = np.concatenate([rgb, rgb, rgb], axis=-1)
            elif rgb.shape[-1] > 3:
                rgb = rgb[:, :, :3]

        h, w = rgb.shape[:2]
        if w != 1024 or h != 576:
            rgb = cv2.resize(rgb, (1024, 576), interpolation=cv2.INTER_AREA)

        tensor = torch.from_numpy(np.ascontiguousarray(rgb, dtype=np.float32)).unsqueeze(0)
        return (tensor,)


class LoadSingleMask:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "folder_path": ("STRING", {"default": "/content/drive/MyDrive/Generative-Imagery-Systems/apple_lora_project/3d_guides/0010", "multiline": False}),
                "mask_file_name": ("STRING", {"default": "Mask_00.png", "multiline": False}),
                "feather_radius": ("INT", {"default": 15, "min": 0, "max": 63, "step": 2}),
                "invert": ("BOOLEAN", {"default": False}),
            }
        }

    RETURN_TYPES = ("MASK",)
    RETURN_NAMES = ("MASK",)
    FUNCTION = "load_mask"
    CATEGORY = "3D_VFX_Pipeline"

    @classmethod
    def IS_CHANGED(s, folder_path, mask_file_name, feather_radius, invert):
        target_dir = folder_path.strip()
        target_file = mask_file_name.strip()
        full_path = os.path.join(target_dir, target_file)
        if os.path.exists(full_path):
            return os.path.getmtime(full_path)
        if os.path.exists(target_dir):
            for f in os.listdir(target_dir):
                if f.lower() == target_file.lower():
                    return os.path.getmtime(os.path.join(target_dir, f))
        return float("nan")

    def load_mask(self, folder_path, mask_file_name, feather_radius=15, invert=False):
        target_dir = folder_path.strip()
        if not os.path.exists(target_dir):
            base_search = os.path.basename(target_dir) if os.path.basename(target_dir) else "0010"
            found_folders = glob.glob(f"/content/drive/MyDrive/**/{base_search}", recursive=True)
            if found_folders:
                target_dir = found_folders[0]
            else:
                return (torch.zeros((1, 576, 1024), dtype=torch.float32),)

        target_file = mask_file_name.strip()
        full_path = os.path.join(target_dir, target_file)
        
        if not os.path.exists(full_path):
            for f in os.listdir(target_dir):
                if f.lower() == target_file.lower():
                    full_path = os.path.join(target_dir, f)
                    break

        if not os.path.exists(full_path):
            return (torch.zeros((1, 576, 1024), dtype=torch.float32),)

        img = cv2.imread(full_path, cv2.IMREAD_GRAYSCALE)
        if img is None:
            return (torch.zeros((1, 576, 1024), dtype=torch.float32),)

        h, w = img.shape[:2]
        if w != 1024 or h != 576:
            img = cv2.resize(img, (1024, 576), interpolation=cv2.INTER_AREA)

        if invert:
            img = 255 - img

        if feather_radius > 0:
            k = feather_radius if feather_radius % 2 == 1 else feather_radius + 1
            img = cv2.GaussianBlur(img, (k, k), 0)

        img_norm = (img.astype(np.float32) / 255.0)
        tensor = torch.from_numpy(np.ascontiguousarray(img_norm)).unsqueeze(0)
        return (tensor,)


class Combine7RegionalMasks:
    @classmethod
    def INPUT_TYPES(s):
        prompt_floor = "solid warm terracotta orange painted wooden tabletop surface, clean smooth matte plaster board"
        prompt_white = "pure solid opaque snow white cosmetic cream swatch, velvety smooth surface, dense buttery texture"
        prompt_clay = "matte warm ochre brown terracotta clay surface, fine grainy paste texture"

        return {
            "required": {
                "base_positive": ("CONDITIONING",),
                "clip": ("CLIP",),
                "mask_00_floor": ("MASK",),
                "prompt_00_floor": ("STRING", {"default": prompt_floor, "multiline": True}),
                "mask_01_white": ("MASK",),
                "prompt_01_white": ("STRING", {"default": prompt_white, "multiline": True}),
                "mask_02_mint": ("MASK",),
                "prompt_02_mint": ("STRING", {"default": prompt_clay, "multiline": True}),
                "mask_03_ochre": ("MASK",),
                "prompt_03_ochre": ("STRING", {"default": prompt_clay, "multiline": True}),
                "mask_04_pink": ("MASK",),
                "prompt_04_pink": ("STRING", {"default": prompt_clay, "multiline": True}),
                "mask_05_honey": ("MASK",),
                "prompt_05_honey": ("STRING", {"default": prompt_clay, "multiline": True}),
                "mask_06_green": ("MASK",),
                "prompt_06_green": ("STRING", {"default": prompt_clay, "multiline": True}),
            }
        }

    RETURN_TYPES = ("CONDITIONING",)
    RETURN_NAMES = ("POSITIVE",)
    FUNCTION = "combine_masks"
    CATEGORY = "3D_VFX_Pipeline"

    def combine_masks(self, base_positive, clip, mask_00_floor, prompt_00_floor, mask_01_white, prompt_01_white, mask_02_mint, prompt_02_mint, mask_03_ochre, prompt_03_ochre, mask_04_pink, prompt_04_pink, mask_05_honey, prompt_05_honey, mask_06_green, prompt_06_green):
        out_pos = []
        for t in base_positive:
            out_pos.append([t[0], t[1].copy()])

        base_pooled = base_positive[0][1].get("pooled_output", None) if len(base_positive) > 0 else None

        items = [
            (mask_00_floor, prompt_00_floor),
            (mask_01_white, prompt_01_white),
            (mask_02_mint, prompt_02_mint),
            (mask_03_ochre, prompt_03_ochre),
            (mask_04_pink, prompt_04_pink),
            (mask_05_honey, prompt_05_honey),
            (mask_06_green, prompt_06_green),
        ]

        for mask_t, text in items:
            if not text or not text.strip():
                continue
            if mask_t is None:
                continue
            
            if torch.max(mask_t) < 1e-4:
                continue

            if len(mask_t.shape) == 2:
                mask_clean = mask_t.unsqueeze(0)
            elif len(mask_t.shape) == 3 and mask_t.shape[0] == 1:
                mask_clean = mask_t
            else:
                mask_clean = mask_t[0].unsqueeze(0)

            tokens_reg = clip.tokenize(text.strip())
            cond_reg, pooled_reg = clip.encode_from_tokens(tokens_reg, return_pooled=True)
            
            c_dict = {
                "pooled_output": base_pooled if base_pooled is not None else pooled_reg,
                "mask": mask_clean,
                "mask_strength": 1.0,
                "set_area_to_bounds": False
            }
            out_pos.append([cond_reg, c_dict])

        return (out_pos,)

NODE_CLASS_MAPPINGS = {
    "LoadNativeEXR": LoadNativeEXR,
    "LoadSingleMask": LoadSingleMask,
    "Combine7RegionalMasks": Combine7RegionalMasks
}
NODE_DISPLAY_NAME_MAPPINGS = {
    "LoadNativeEXR": "📦 Load 3D Pass (PNG & EXR Native)",
    "LoadSingleMask": "🎭 Load Single 3D Mask (Feathered)",
    "Combine7RegionalMasks": "👑 7-Mask Regional Combiner (ControlNet-Safe)"
}
