import os
import cv2
import numpy as np
from PIL import Image

def process_reference_08():
    input_path = "Reference/Reference_08.png"
    output_dir = "dataset/test_output"
    os.makedirs(output_dir, exist_ok=True)
    
    img = cv2.imread(input_path)
    h, w = img.shape[:2]
    print(f"Original size: {w}x{h}")
    
    # 1. 워터마크 영역 마스크 생성
    mask = np.zeros((h, w), dtype=np.uint8)
    
    # GettyImages 박스 영역 (대략적인 위치)
    # y: 610~730, x: 1090~1794
    # 또한 하단 좌측 숫자: y: 1250~1314, x: 0~120
    mask[610:730, 1090:1794] = 255
    mask[1250:1314, 0:120] = 255
    
    # 2. Inpainting (Telea & Navier-Stokes)
    inpaint_telea = cv2.inpaint(img, mask, 7, cv2.INPAINT_TELEA)
    inpaint_ns = cv2.inpaint(img, mask, 7, cv2.INPAINT_NS)
    
    # 3. 1024x1024 크롭 버전 생성 (워터마크 완전 회피 크롭 vs 인페인팅 후 중앙 크롭)
    # 3-A: 인페인팅 후 1024x1024 중앙 크롭
    target_size = 1024
    cx, cy = w // 2, h // 2
    left = max(0, cx - target_size // 2)
    top = max(0, cy - target_size // 2)
    
    crop_inpaint_telea = inpaint_telea[top:top+target_size, left:left+target_size]
    
    # 3-B: 워터마크를 상향 회피한 1024x1024 클린 크롭 (인페인팅 없이 상단 순수 영역)
    # 상단 0~1024, 좌측 100~1124 (크림 중앙 포커스)
    clean_top = 0
    clean_left = (w - target_size) // 2
    crop_clean = img[clean_top:clean_top+target_size, clean_left:clean_left+target_size]
    
    # 결과 저장
    cv2.imwrite(f"{output_dir}/ref08_inpaint_full.png", inpaint_telea)
    cv2.imwrite(f"{output_dir}/ref08_inpaint_crop1024.png", crop_inpaint_telea)
    cv2.imwrite(f"{output_dir}/ref08_clean_crop1024.png", crop_clean)
    
    print(f"테스트 완료! 파일이 {output_dir} 에 저장되었습니다.")

if __name__ == "__main__":
    process_reference_08()
