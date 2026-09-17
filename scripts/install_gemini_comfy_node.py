import os
import json
from pathlib import Path

target_dir = Path(r"C:\Users\DJ\AppData\Local\Comfy-Desktop\ComfyUI-Installs\ComfyUI\ComfyUI\custom_nodes\ComfyUI-Gemini-LookDev")
target_dir.mkdir(parents=True, exist_ok=True)

code = '''import os
import json
import base64
import io
import urllib.request
import numpy as np
import torch
from PIL import Image

class GeminiLookDevVLMNode:
    """
    Native ComfyUI Node for Gemini 3.5 Flash VLM.
    Takes 3 Essential 3D Guide images (Color, Normal, Depth) and analyzes them
    to generate ultra-high precision LookDev prompts directly for FLUX.1-dev.
    """
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "color_guide": ("IMAGE",),
                "normal_guide": ("IMAGE",),
                "depth_guide": ("IMAGE",),
                "api_key": ("STRING", {
                    "default": "",
                    "multiline": False
                }),
                "lookdev_style": ("STRING", {
                    "default": "a photo in apple minimal craft style of, minimalist commercial studio photography, top-down flat lay view, professional luxury skincare cosmetic swatches",
                    "multiline": True
                }),
                "tabletop_surface": ("STRING", {
                    "default": "clean matte studio tabletop surface with soft contact ambient occlusion shadows",
                    "multiline": False
                }),
                "lighting_setup": ("STRING", {
                    "default": "directional key light from top-right (1 o'clock) at a shallow 30-degree grazing angle",
                    "multiline": False
                }),
            },
            "optional": {
                "custom_instruction": ("STRING", {
                    "default": "CRITICAL: Swatches are thick, high-viscosity cosmetic liquid gels with high surface tension and internal caustics. NOT flower petals, leaves, or paper.",
                    "multiline": True
                }),
            }
        }

    RETURN_TYPES = ("STRING", "STRING")
    RETURN_NAMES = ("flux_master_prompt", "negative_prompt")
    FUNCTION = "analyze_and_generate"
    CATEGORY = "Spatial LookDev / Gemini VLM"

    def tensor_to_base64(self, tensor_img):
        if len(tensor_img.shape) == 4:
            tensor_img = tensor_img[0]
        i = 255.0 * tensor_img.cpu().numpy()
        img = Image.fromarray(np.clip(i, 0, 255).astype(np.uint8))
        buffered = io.BytesIO()
        img.save(buffered, format="PNG")
        return base64.b64encode(buffered.getvalue()).decode("utf-8")

    def analyze_and_generate(self, color_guide, normal_guide, depth_guide, api_key, lookdev_style, tabletop_surface, lighting_setup, custom_instruction=""):
        images = [
            ("Color Pass", color_guide),
            ("Normal Pass", normal_guide),
            ("Depth Pass", depth_guide)
        ]

        gemini_parts = []
        for name, img_tensor in images:
            b64_str = self.tensor_to_base64(img_tensor)
            gemini_parts.append({
                "inline_data": {
                    "mime_type": "image/png",
                    "data": b64_str
                }
            })

        system_instruction = f"""You are the Lead Apple Spatial LookDev CGI Supervisor.
Analyze the attached 3D spatial guide passes (Color, Normal, Depth).

CMF DIRECTIVES:
- Style: {lookdev_style}
- Tabletop: {tabletop_surface}
- Lighting: {lighting_setup}
- Extra Rules: {custom_instruction}

SYNTHESIS TASK:
Synthesize an ultra-high precision, photorealistic LookDev master prompt for FLUX.1-dev (80-120 words).
Explicitly describe:
1. The exact arrangement, count, and color flow of the swatches seen in the guides.
2. Convex meniscus domes, thick viscous liquid structure, and wet glass-like specular highlights.
3. Optical light transmission, internal caustics, and grounding ambient occlusion contact shadows.

Return a valid JSON object ONLY:
{{
  "masterPrompt": "The complete FLUX.1-dev master prompt string",
  "negativePrompt": "petals, flower, leaf, plant, botanical, fibrous grain, radial venation, dry paper, thin shell, wood texture, blur, distortion"
}}"""

        contents = [{"text": system_instruction}] + gemini_parts
        payload = {
            "contents": [{"parts": contents}],
            "generationConfig": {
                "response_mime_type": "application/json",
                "temperature": 0.4
            }
        }

        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key={api_key.strip()}"
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )

        try:
            with urllib.request.urlopen(req, timeout=40) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
                res_json = json.loads(raw_text)
                master_prompt = res_json.get("masterPrompt", "")
                neg_prompt = res_json.get("negativePrompt", "petals, flower, leaf, plant, botanical, dry paper, blur")
                print(f"[GeminiLookDevVLM] Successfully synthesized master prompt:\\n{master_prompt}")
                return (master_prompt, neg_prompt)
        except Exception as e:
            print(f"[GeminiLookDevVLM] Error calling Gemini API: {e}")
            fallback = f"{lookdev_style}, thick viscous cosmetic liquid gel swatches, convex meniscus domes, wet glossy finish, internal caustics, {lighting_setup}, {tabletop_surface}, ultra-high precision lookdev."
            return (fallback, "petals, flower, leaf, plant, blur, distortion")

NODE_CLASS_MAPPINGS = {
    "GeminiLookDevVLMNode": GeminiLookDevVLMNode
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "GeminiLookDevVLMNode": "💎 Gemini 3.5 LookDev VLM Analyzer"
}
'''

with open(target_dir / "__init__.py", "w", encoding="utf-8") as f:
    f.write(code)

print("SUCCESS! Updated 3-pass Gemini custom node at:", target_dir / "__init__.py")
