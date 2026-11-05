"""필름 프레임 + 오버레이 + PiP + 전환을 합성해 mp4로 인코딩한다.

사용: python3 -I compose.py <film_dir> <overlay_dir> <out_mp4>
"""
import json
import os
import subprocess
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

film, ovd, out_mp4 = sys.argv[1:4]
W, H = 1600, 900
FPS = 25
log = json.load(open(os.path.join(film, "film_log.json")))
frames = log["frames"]
tmp = os.path.join(film, "composed")
os.makedirs(tmp, exist_ok=True)
for f in os.listdir(tmp):
    os.remove(os.path.join(tmp, f))

ov = {k: Image.open(os.path.join(ovd, f"ov_{k}.png")).convert("RGBA") for k in ["S1", "S2", "S3", "S4", "S5", "S6"]}
mono = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf", 13) if os.path.exists("/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf") else ImageFont.load_default()


def load(i):
    if isinstance(i, str):  # S3 교체 프레임
        return Image.open(os.path.join(film, "s3new", i)).convert("RGB")
    return Image.open(os.path.join(film, "frames", f"{i:05d}.jpg")).convert("RGB")


def pip(img, i):
    g = os.path.join(film, "gimbal", f"{i:05d}.jpg")
    if not os.path.exists(g):
        return img
    gi = Image.open(g).convert("RGB").resize((416, 234), Image.LANCZOS)
    x, y = W - 416 - 48, 120
    shadow = Image.new("RGBA", (436, 254), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rectangle([10, 10, 426, 244], fill=(0, 0, 0, 140))
    img.paste(shadow.filter(ImageFilter.GaussianBlur(8)), (x - 10, y - 10), shadow.filter(ImageFilter.GaussianBlur(8)))
    img.paste(gi, (x, y))
    d = ImageDraw.Draw(img)
    d.rectangle([x - 1, y - 1, x + 416, y + 234], outline=(95, 212, 240), width=1)
    d.rectangle([x, y, x + 196, y + 22], fill=(7, 11, 18))
    d.text((x + 8, y + 4), "GIMBAL CAM · PTZ VIEW", font=mono, fill=(159, 230, 247))
    return img


# 장면 순서대로 정리 (S3B는 S3 끝 40프레임과 짝지어 크로스페이드)
by_scene = {}
for f in frames:
    by_scene.setdefault(f["scene"], []).append(f["i"])
# S3는 별도로 다시 렌더링한 프레임(sim/phase8_s3.py)으로 교체. 첫 3프레임은 렌더러 준비 전이라 건너뛴다.
S3DIR = os.path.join(film, "s3new")
if os.path.isdir(S3DIR):
    clouds = sorted(f for f in os.listdir(S3DIR) if f.startswith("cloud_"))
    worlds = sorted(f for f in os.listdir(S3DIR) if f.startswith("world_"))
    by_scene["S3"] = [clouds[max(3, k)] for k in range(len(clouds))]
    by_scene["S3B"] = worlds
s3b = by_scene.get("S3B", [])
order = []
for s in ["S1", "S2", "S3", "S4", "S5", "S6"]:
    for k, i in enumerate(by_scene.get(s, [])):
        order.append((s, k, i))

out_idx = 0
prev_last = None
scene_start = {}
for s, k, i in order:
    img = load(i)
    if s == "S3":
        n = len(by_scene["S3"])
        j = k - (n - len(s3b))
        if 0 <= j < len(s3b):
            a = min(1.0, (j + 1) / len(s3b))
            img = Image.blend(img, load(s3b[j]), a)
    if s == "S2" or (s == "S1" and k > 60):
        img = pip(img, i)
    # 장면 전환: 앞 장면 마지막 프레임에서 10프레임 크로스페이드
    if k == 0:
        scene_start[s] = out_idx
    if k < 10 and prev_last is not None and s != "S1":
        img = Image.blend(prev_last, img, (k + 1) / 10)
    base = img.convert("RGBA")
    o = ov[s]
    if k < 12:  # 오버레이 페이드 인
        o = o.copy()
        alpha = o.getchannel("A").point(lambda v: int(v * (k + 1) / 12))
        o.putalpha(alpha)
    base.alpha_composite(o)
    base.convert("RGB").save(os.path.join(tmp, f"{out_idx:05d}.jpg"), quality=94)
    out_idx += 1
    nxt = None
    prev_last = img if True else nxt

# S7: 아키텍처 카드 → 타이틀 카드
arch = Image.open(os.path.join(ovd, "final_arch.png")).convert("RGB")
title = Image.open(os.path.join(ovd, "final_title.png")).convert("RGB")
for k in range(15):  # 마지막 장면에서 아키텍처로
    Image.blend(prev_last, arch, (k + 1) / 15).save(os.path.join(tmp, f"{out_idx:05d}.jpg"), quality=94)
    out_idx += 1
for k in range(60):
    arch.save(os.path.join(tmp, f"{out_idx:05d}.jpg"), quality=94)
    out_idx += 1
for k in range(15):
    Image.blend(arch, title, (k + 1) / 15).save(os.path.join(tmp, f"{out_idx:05d}.jpg"), quality=94)
    out_idx += 1
for k in range(75):
    title.save(os.path.join(tmp, f"{out_idx:05d}.jpg"), quality=94)
    out_idx += 1

subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", os.path.join(tmp, "%05d.jpg"),
                "-vf", "fade=t=in:st=0:d=0.6,fade=t=out:st=%.2f:d=0.8" % (out_idx / FPS - 0.8),
                "-c:v", "libx264", "-preset", "slow", "-crf", "22", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out_mp4], check=True)
print(json.dumps({"frames": out_idx, "seconds": round(out_idx / FPS, 1), "scene_start_frames": scene_start}))
