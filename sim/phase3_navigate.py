"""PHASE 3: Go2 Ent-MTPTZ가 매장 스캔 경로를 물리 기반 보행으로 따라간다.

검증: 경로 완주 여부, 소요 시간, 집기와의 최소 거리, 궤적 시각화 렌더.
"""
import json
import math
import os
import sys

from isaacsim import SimulationApp

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "output", "phase3")
os.makedirs(OUT, exist_ok=True)
app = SimulationApp({"headless": True})
sys.path.insert(0, HERE)
from sim_common import Go2Walker, enable_extensions, physics_material, setup_physics  # noqa: E402

enable_extensions(["isaacsim.robot.policy.examples", "isaacsim.storage.native", "omni.replicator.core"])
import numpy as np  # noqa: E402
import omni.replicator.core as rep  # noqa: E402
import omni.timeline  # noqa: E402
import omni.usd  # noqa: E402
import isaacsim.core.experimental.utils.stage as stage_utils  # noqa: E402
from isaacsim.core.simulation_manager import SimulationManager  # noqa: E402
from isaacsim.storage.native import get_assets_root_path  # noqa: E402
from PIL import Image  # noqa: E402
from pxr import Gf, Sdf, UsdGeom, UsdShade, Vt  # noqa: E402
from nav import PathFollower  # noqa: E402
from ptz_payload import PTZPayload  # noqa: E402
from store_scene import FIXTURES, SIM_PATH as PATH, TABLE, build_store  # noqa: E402

root = get_assets_root_path()
omni.usd.get_context().new_stage()
stage = omni.usd.get_context().get_stage()
stage_utils.set_stage_up_axis("Z")
stage_utils.set_stage_units(meters_per_unit=1.0)
SimulationManager.set_backend("torch")
SimulationManager.set_physics_sim_device("cuda")
build_store(stage, root)
physics_material(stage, "/World/Store/Looks/FloorPhysics", ["/World/Store/Floor"])

start = PATH[0]
go2 = Go2Walker(position=(start[0], start[1], 0.4), yaw=-math.pi / 2)
go2.spawn()
PTZPayload(stage, "/World/Go2/base")
dt = setup_physics(app)
go2.attach()

nav = PathFollower(PATH, speed=0.42)
omni.timeline.get_timeline_interface().play()
for _ in range(60):
    app.update()

traj = []
t = 0.0
while t < 100.0:
    p, yaw = go2.pose()
    go2.set_target(nav.command(p[0], p[1], yaw))
    app.update()
    t += 0.02
    if int(t / 0.02) % 5 == 0:
        traj.append((float(p[0]), float(p[1]), float(p[2]), yaw))
    if nav.done and max(abs(c) for c in go2.command) < 0.02:
        break
for _ in range(25):
    p, yaw = go2.pose()
    go2.set_target(nav.command(p[0], p[1], yaw))
    app.update()
p, yaw = go2.pose()


# 집기와의 최소 거리 (2D, 로봇 중심 기준)
def clearance(x, y):
    best = 9.0
    boxes = list(FIXTURES.values()) + [TABLE]
    for x0, y0, x1, y1, _h in boxes:
        dx = max(x0 - x, 0, x - x1)
        dy = max(y0 - y, 0, y - y1)
        best = min(best, math.hypot(dx, dy))
    return best


inside = [q for q in traj if 0 < q[1] < 6]
min_clear = min(clearance(q[0], q[1]) for q in inside) if inside else None

# 궤적을 씬에 곡선으로 그림
mat = UsdShade.Material.Define(stage, "/World/Viz/Looks/Trail")
sh = UsdShade.Shader.Define(stage, "/World/Viz/Looks/Trail/S")
sh.CreateIdAttr("UsdPreviewSurface")
sh.CreateInput("diffuseColor", Sdf.ValueTypeNames.Color3f).Set(Gf.Vec3f(0.2, 0.85, 1.0))
sh.CreateInput("emissiveColor", Sdf.ValueTypeNames.Color3f).Set(Gf.Vec3f(0.3, 1.6, 2.0))
mat.CreateSurfaceOutput().ConnectToSource(sh.ConnectableAPI(), "surface")
curve = UsdGeom.BasisCurves.Define(stage, "/World/Viz/Trajectory")
pts = [Gf.Vec3f(q[0], q[1], 0.02) for q in traj]
curve.CreatePointsAttr(Vt.Vec3fArray(pts))
curve.CreateCurveVertexCountsAttr([len(pts)])
curve.CreateTypeAttr("linear")
curve.CreateWidthsAttr(Vt.FloatArray([0.035] * len(pts)))
curve.SetWidthsInterpolation("vertex")
UsdShade.MaterialBindingAPI.Apply(curve.GetPrim()).Bind(mat)

shots = {"top": ((4.0, 2.4, 9.5), (4.0, 3.0, 0.0)), "overview": ((7.7, 5.8, 2.55), (3.2, 2.2, 0.3)), "arrival": ((4.9, 0.7, 1.4), (6.6, 1.8, 0.4))}
anns = {}
for name, (pos, look) in shots.items():
    cam = rep.create.camera(position=pos, look_at=look, focal_length=14.0 if name == "top" else 18.0)
    rp = rep.create.render_product(cam, (1280, 720))
    a = rep.AnnotatorRegistry.get_annotator("rgb")
    a.attach(rp)
    anns[name] = a
for _ in range(12):
    app.update()
for name, a in anns.items():
    Image.fromarray(np.asarray(a.get_data())[:, :, :3]).save(os.path.join(OUT, f"{name}.png"))

report = {
    "completed": nav.done,
    "path_progress": round(nav.progress, 3),
    "sim_time_s": round(t, 1),
    "final_pose": [round(float(p[0]), 2), round(float(p[1]), 2), round(yaw, 2)],
    "final_target": list(PATH[-1]),
    "min_clearance_to_fixtures_m": round(min_clear, 3) if min_clear is not None else None,
    "policy_error": go2.error,
}
print("[phase3] REPORT " + json.dumps(report), flush=True)
json.dump({"report": report, "trajectory": traj}, open(os.path.join(OUT, "trajectory.json"), "w"))
omni.timeline.get_timeline_interface().stop()
app.close()
