"""PHASE 4 + 5: 짐벌 카메라 + RTX LiDAR로 매장을 스캔하고 포인트 클라우드를 만든다.

- 이동: 번들 Go2 보행 정책 + pure pursuit (물리 기반)
- 짐벌(PTZ): 좌우로 천천히 훑는 스캔 동작 (사양 범위 안에서 스크립트로 각도 지정)
- LiDAR: NVIDIA Example_Rotary (범용 회전형 모델). Go2 Ent-MTPTZ의 실제 LiDAR 구성과는 다를 수 있다.
- 포인트 클라우드: 시뮬레이션 LiDAR 출력(GMO)을 로봇 자세로 월드 좌표에 누적, 5 cm 복셀로 줄인다.

출력: sim/output/phase4/ (gimbal_XX.png, cloud.npz, cloud.ply, cloud_*.png, report.json)
"""
import json
import math
import os
import sys

from isaacsim import SimulationApp

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "output", "phase4")
os.makedirs(OUT, exist_ok=True)
app = SimulationApp({"headless": True})
sys.path.insert(0, HERE)
from sim_common import Go2Walker, enable_extensions, physics_material, setup_physics  # noqa: E402

enable_extensions(["isaacsim.robot.policy.examples", "isaacsim.storage.native", "omni.replicator.core", "isaacsim.sensors.experimental.rtx"])
import numpy as np  # noqa: E402
import omni.replicator.core as rep  # noqa: E402
import omni.timeline  # noqa: E402
import omni.usd  # noqa: E402
import isaacsim.core.experimental.utils.stage as stage_utils  # noqa: E402
from isaacsim.core.simulation_manager import SimulationManager  # noqa: E402
from isaacsim.sensors.experimental.rtx import Lidar, LidarSensor, parse_generic_model_output_data  # noqa: E402
from isaacsim.storage.native import get_assets_root_path  # noqa: E402
from PIL import Image  # noqa: E402
from pxr import Gf, UsdGeom, Vt  # noqa: E402
from nav import PathFollower  # noqa: E402
from ptz_payload import PTZPayload  # noqa: E402
from store_scene import SIM_PATH, build_store  # noqa: E402

LIDAR_MOUNT = np.array([0.28, 0.0, 0.08])  # base 링크 기준 (몸통 앞쪽 위)

root = get_assets_root_path()
omni.usd.get_context().new_stage()
stage = omni.usd.get_context().get_stage()
stage_utils.set_stage_up_axis("Z")
stage_utils.set_stage_units(meters_per_unit=1.0)
SimulationManager.set_backend("torch")
SimulationManager.set_physics_sim_device("cuda")
build_store(stage, root)
physics_material(stage, "/World/Store/Looks/FloorPhysics", ["/World/Store/Floor"])

start = SIM_PATH[0]
go2 = Go2Walker(position=(start[0], start[1], 0.4), yaw=-math.pi / 2)
go2.spawn()
ptz = PTZPayload(stage, "/World/Go2/base")

lidar = Lidar.create(
    "/World/Go2/base/Lidar",
    config="Example_Rotary",
    translations=[LIDAR_MOUNT.tolist()],
    tick_rate=10.0,
    accumulate_outputs=True,
)
lidar_sensor = LidarSensor(lidar, annotators=["generic-model-output"])

gimbal_rp = rep.create.render_product(ptz.camera_path, (960, 540))
gimbal_ann = rep.AnnotatorRegistry.get_annotator("rgb")
gimbal_ann.attach(gimbal_rp)

dt = setup_physics(app)
go2.attach()
nav = PathFollower(SIM_PATH, speed=0.42)
omni.timeline.get_timeline_interface().play()
for _ in range(60):
    app.update()


def quat_to_mat(w, x, y, z):
    return np.array([
        [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
        [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
        [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)],
    ])


def base_pose():
    pos, quat = go2.runner.articulation.get_world_poses()
    p = (pos.numpy() if hasattr(pos, "numpy") else np.asarray(pos)).reshape(-1, 3)[0]
    q = (quat.numpy() if hasattr(quat, "numpy") else np.asarray(quat)).reshape(-1, 4)[0]
    return p.astype(np.float64), quat_to_mat(*q.astype(np.float64))


VOXEL = 0.05
voxels = {}  # 복셀 키 → 대표점 (새 스캔이 올 때마다 즉시 다운샘플)
last_frame = None
scans = 0
raw_count = 0
gmo_meta = None
frames_saved = 0
t = 0.0
step = 0
while t < 75.0:
    p, yaw = go2.pose()
    go2.set_target(nav.command(p[0], p[1], yaw))
    # 짐벌: 좌우로 천천히 훑고, 가끔 위아래로 선반을 본다
    ptz.set(65.0 * math.sin(t * 0.7), 12.0 * math.sin(t * 0.33) - 4.0)
    app.update()
    t += 0.02
    step += 1

    data, _info = lidar_sensor.get_data("generic-model-output")
    if data is not None:
        gmo = parse_generic_model_output_data(data)
        n = int(gmo.numElements)
        x = np.asarray(gmo.x)[:n].astype(np.float64) if n > 0 else None
        sig = (n, float(x[:64].sum())) if n > 0 else None
        if n > 0 and sig != last_frame:
            last_frame = sig
            scans += 1
            y = np.asarray(gmo.y)[:n].astype(np.float64)
            z = np.asarray(gmo.z)[:n].astype(np.float64)
            if gmo_meta is None:
                gmo_meta = {
                    "coords": str(gmo.elementsCoordsType),
                    "frame": str(gmo.frameOfReference),
                    "n_first": n,
                    "x_range": [float(x.min()), float(x.max())],
                    "y_range": [float(y.min()), float(y.max())],
                    "z_range": [float(z.min()), float(z.max())],
                }
                print("[phase4] GMO", json.dumps(gmo_meta), flush=True)
            if "SPHERICAL" in str(gmo.elementsCoordsType):
                az, el, r = np.radians(x), np.radians(y), z
                x, y, z = r * np.cos(el) * np.cos(az), r * np.cos(el) * np.sin(az), r * np.sin(el)
            pts = np.stack([x, y, z], 1)
            pts = pts[np.isfinite(pts).all(1) & (np.linalg.norm(pts, axis=1) > 0.15)]
            if "WORLD" not in str(gmo.frameOfReference):
                bp, R = base_pose()
                pts = (R @ (pts + LIDAR_MOUNT).T).T + bp
            raw_count += len(pts)
            keys = np.floor(pts / VOXEL).astype(np.int64)
            uk, ui = np.unique(keys, axis=0, return_index=True)
            for k, q in zip(map(tuple, uk), pts[ui].astype(np.float32)):
                if k not in voxels:
                    voxels[k] = q

    if step % 150 == 0 and frames_saved < 8:
        img = np.asarray(gimbal_ann.get_data())
        if img.size:
            Image.fromarray(img[:, :, :3]).save(os.path.join(OUT, f"gimbal_{frames_saved:02d}.png"))
            frames_saved += 1
    if nav.done and max(abs(c) for c in go2.command) < 0.02:
        break

allv = np.array(list(voxels.values()), dtype=np.float32) if voxels else np.zeros((0, 3), np.float32)
# 매장 범위 밖(입구 너머 등)과 바닥 아래 잡음 제거
m = (allv[:, 0] > -0.3) & (allv[:, 0] < 8.3) & (allv[:, 1] > -0.3) & (allv[:, 1] < 6.4) & (allv[:, 2] > -0.05) & (allv[:, 2] < 2.8)
cloud = allv[m]
np.savez_compressed(os.path.join(OUT, "cloud.npz"), points=cloud)
with open(os.path.join(OUT, "cloud.ply"), "w") as f:
    f.write(f"ply\nformat ascii 1.0\nelement vertex {len(cloud)}\nproperty float x\nproperty float y\nproperty float z\nend_header\n")
    np.savetxt(f, cloud, fmt="%.3f")

# 포인트 클라우드를 씬에 표시 (높이에 따라 파랑 → 시안 → 흰색)
zc = np.clip(cloud[:, 2] / 2.4, 0, 1)
c0, c1, c2 = np.array([0.2, 0.38, 0.75]), np.array([0.37, 0.83, 0.94]), np.array([0.93, 0.97, 0.99])
cols = np.where(zc[:, None] < 0.55, c0 + (c1 - c0) * (zc[:, None] / 0.55), c1 + (c2 - c1) * ((zc[:, None] - 0.55) / 0.45))
pp = UsdGeom.Points.Define(stage, "/World/Viz/PointCloud")
pp.CreatePointsAttr(Vt.Vec3fArray.FromNumpy(cloud.astype(np.float32)))
pp.CreateWidthsAttr(Vt.FloatArray([0.025] * len(cloud)))
pp.SetWidthsInterpolation(UsdGeom.Tokens.vertex)
pp.CreateDisplayColorPrimvar(UsdGeom.Tokens.vertex).Set(Vt.Vec3fArray.FromNumpy(cols.astype(np.float32)))

shots = {"cloud_overview": ((7.7, 5.8, 2.6), (3.2, 2.2, 0.3)), "cloud_top": ((4.0, 2.4, 9.5), (4.0, 3.0, 0.0))}
anns = {}
for name, (pos, look) in shots.items():
    cam = rep.create.camera(position=pos, look_at=look, focal_length=14.0 if "top" in name else 18.0)
    rp = rep.create.render_product(cam, (1280, 720))
    a = rep.AnnotatorRegistry.get_annotator("rgb")
    a.attach(rp)
    anns[name] = a
for _ in range(10):
    app.update()
for name, a in anns.items():
    Image.fromarray(np.asarray(a.get_data())[:, :, :3]).save(os.path.join(OUT, f"{name}_mixed.png"))
# 매장 형상을 숨기고 점만 보이게
UsdGeom.Imageable(stage.GetPrimAtPath("/World/Store")).MakeInvisible()
UsdGeom.Imageable(stage.GetPrimAtPath("/World/Go2")).MakeInvisible()
for _ in range(10):
    app.update()
for name, a in anns.items():
    Image.fromarray(np.asarray(a.get_data())[:, :, :3]).save(os.path.join(OUT, f"{name}_only.png"))

report = {
    "completed": nav.done,
    "sim_time_s": round(t, 1),
    "lidar": "NVIDIA Example_Rotary (simulated, generic)",
    "gmo": gmo_meta,
    "lidar_scans": scans,
    "raw_points": int(raw_count),
    "cloud_points_5cm": int(len(cloud)),
    "gimbal_frames": frames_saved,
    "policy_error": go2.error,
}
print("[phase4] REPORT " + json.dumps(report), flush=True)
json.dump(report, open(os.path.join(OUT, "report.json"), "w"), indent=2)
omni.timeline.get_timeline_interface().stop()
app.close()
