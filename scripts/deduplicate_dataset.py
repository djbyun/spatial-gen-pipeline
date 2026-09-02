import os
import shutil

def deduplicate_and_renumber():
    crop_dir = "dataset/cropped_1024"
    backup_dir = "dataset/cropped_backup_all"
    
    # 1. 기존 전체 파일 백업
    os.makedirs(backup_dir, exist_ok=True)
    existing_files = sorted([f for f in os.listdir(crop_dir) if f.endswith('.png')])
    for f in existing_files:
        shutil.copy2(os.path.join(crop_dir, f), os.path.join(backup_dir, f))
    print(f"기존 {len(existing_files)}개 파일 전체를 {backup_dir}에 백업했습니다.")
    
    # 2. 엄선된 유니크 이미지 리스트 (중복 배제 21장)
    keep_list = [
        "image_00.png", # 매크로 크림 스월
        "image_01.png", # 핑크 배경 파스텔 5색 스와치 A
        "image_02.png", # 베이지 배경 층층이 스와치
        "image_03.png", # 젤 드롭릿 + 빗살무늬 크림
        "image_04.png", # 옐로우 배경 + 팝콘 크림
        "image_06.png", # 브라운 스크럽 + 테라코타 크림
        "image_08.png", # 투명 젤 기포 + 다색 크림
        "image_09.png", # 화이트 & 테라코타 크림
        "image_10.png", # 화이트 배경 테라코타 클레이
        "image_12.png", # 골드 & 핑크 스와치
        "image_13.png", # 뉴트럴 스킨톤 스월
        "image_14.png", # 옐로우 & 핑크 콤브 텍스처
        "image_15.png", # 파스텔 핑크 질감 스와치
        "image_16.png", # 옐로우 배경 둥근 스와치
        "image_17.png", # 핑크 배경 브러시스트로크 크림
        "image_19.png", # 핑크 펄 크림 스월
        "image_24.png", # 옐로우 패턴 멀티 스와치
        "image_25.png", # 베이지 배경 3색 크림
        "image_26.png", # 화이트 배경 3색 크림
        "image_28.png", # 핑크 배경 파스텔 스와치 B (다른 앵글)
        "image_29.png", # 수직 4단 스와치
    ]
    
    # 3. crop_dir 정리 후 순차 번호(image_00.png ~)로 재배치
    # 먼저 기존 파일들 삭제
    for f in os.listdir(crop_dir):
        if f.endswith('.png'):
            os.remove(os.path.join(crop_dir, f))
            
    # 백업에서 엄선된 파일들을 순서대로 복사 및 리네이밍
    print("\n=== 유니크 데이터셋 재정렬 및 리네이밍 ===")
    for idx, src_name in enumerate(keep_list):
        new_name = f"image_{idx:02d}.png"
        src_path = os.path.join(backup_dir, src_name)
        dst_path = os.path.join(crop_dir, new_name)
        shutil.copy2(src_path, dst_path)
        print(f"[{idx:02d}/20] {src_name} -> {new_name}")
        
    final_files = sorted([f for f in os.listdir(crop_dir) if f.endswith('.png')])
    print(f"\n총 {len(final_files)}장의 순수 유니크 데이터셋 구성 완료! ({final_files[0]} ~ {final_files[-1]})")

if __name__ == "__main__":
    deduplicate_and_renumber()
