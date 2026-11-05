"""PHASE 10 렌더 결과를 사이트용 파일로 바꾼다.

  python3 -I sim/post/cinematic_assets.py sim/output/cinematic public/assets/cinematic

- 정지 컷(jpg) → webp 2560px, 1280px
- 통로 영상 프레임 → hero.mp4 (1920×1080), hero-960.mp4 (모바일), hero-poster.webp
  루프 이음매가 튀지 않게 앞뒤 0.5초를 어둡게 페이드한다.
"""
import glob
import os
import subprocess
import sys

from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
os.makedirs(dst, exist_ok=True)

USE = {"door_night", "arm_macro", "arm_wide", "cloud_wide", "cloud_aisle"}
for path in sorted(glob.glob(os.path.join(src, "*", "*.jpg"))):
    name = os.path.splitext(os.path.basename(path))[0]
    if name not in USE:
        continue
    im = Image.open(path).convert("RGB")
    im.save(os.path.join(dst, f"{name}.webp"), quality=82, method=6)
    im.resize((1280, round(im.height * 1280 / im.width)), Image.LANCZOS).save(os.path.join(dst, f"{name}-1280.webp"), quality=80, method=6)
    print("still", name, im.size)

frames = os.path.join(src, "aisle", "frames")
n = len(glob.glob(os.path.join(frames, "*.jpg")))
# 영상 프레임 중 사이트 정지 컷으로 쓰는 장면 (측면 3/4가 다리 모양이 자연스럽다)
FRAME_STILLS = {"aisle_walk": 10, "aisle_gimbal": 60, "aisle_close": 110}
for name, idx in FRAME_STILLS.items():
    fp = os.path.join(frames, f"{idx:04d}.jpg")
    if os.path.exists(fp):
        im = Image.open(fp).convert("RGB")
        im.save(os.path.join(dst, f"{name}.webp"), quality=84, method=6)
        im.resize((1280, 720), Image.LANCZOS).save(os.path.join(dst, f"{name}-1280.webp"), quality=80, method=6)
        print("frame still", name, idx)
HERO_FRAMES = 116  # 뒷부분은 로봇이 카메라에 너무 붙어서 첫 화면 루프에서는 뺀다
if n:
    n = min(n, HERO_FRAMES)
    fps = 25
    dur = n / fps
    fade = f"fade=t=in:st=0:d=0.5,fade=t=out:st={dur - 0.5:.2f}:d=0.5"
    common = ["-framerate", str(fps), "-i", os.path.join(frames, "%04d.jpg"), "-frames:v", str(n), "-an", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-c:v", "libx264", "-preset", "slow"]
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *common[:4], "-vf", fade, *common[4:], "-crf", "21", os.path.join(dst, "hero.mp4")], check=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *common[:4], "-vf", f"scale=960:-2,{fade}", *common[4:], "-crf", "25", os.path.join(dst, "hero-960.mp4")], check=True)
    # 포스터는 페이드가 끝난 뒤 프레임
    Image.open(os.path.join(frames, f"{min(n - 1, 14):04d}.jpg")).convert("RGB").save(os.path.join(dst, "hero-poster.webp"), quality=80, method=6)
    print("hero", n, "frames", round(dur, 2), "s")
