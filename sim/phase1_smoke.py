"""PHASE 1 smoke test for Isaac Sim 6.2.

확인 항목:
  1. 헤드리스 SimulationApp 실행
  2. 공식 Go2 USD + 번들 flat-terrain 보행 정책으로 물리 기반 전진
  3. 공식 SO-101 USD 로드와 관절 목록
  4. Replicator 카메라 RGB 렌더링
실행: ~/isaacsim62_env/bin/python sim/phase1_smoke.py
"""
import json
import os
import time

from isaacsim import SimulationApp

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "output", "phase1")
os.makedirs(OUT, exist_ok=True)
t0 = time.time()
app = SimulationApp({"headless": True, "width": 1280, "height": 720})

import omni.kit.app  # noqa: E402

ext = omni.kit.app.get_app().get_extension_manager()
for name in ["isaacsim.robot.policy.examples", "isaacsim.storage.native", "omni.replicator.core"]:
    ext.set_extension_enabled_immediate(name, True)

import numpy as np  # noqa: E402
import omni.timeline  # noqa: E402
import omni.usd  # noqa: E402
import isaacsim.core.experimental.utils.stage as stage_utils  # noqa: E402
import omni.replicator.core as rep  # noqa: E402
from isaacsim.core.rendering_manager import RenderingManager  # noqa: E402
from isaacsim.core.simulation_manager import IsaacEvents, SimulationManager  # noqa: E402
from isaacsim.robot.policy.examples import RobotPolicyRunner, get_go2_spec  # noqa: E402
from isaacsim.storage.native import get_assets_root_path  # noqa: E402
from PIL import Image  # noqa: E402
from pxr import Gf, Usd, UsdGeom, UsdPhysics  # noqa: E402

report = {"isaac_sim": open(os.path.join(os.path.dirname(__import__("isaacsim").__file__), "VERSION")).read().strip()}
root = get_assets_root_path()
report["assets_root"] = root
print("[phase1] assets root:", root, flush=True)

omni.usd.get_context().new_stage()
stage = omni.usd.get_context().get_stage()
stage_utils.add_reference_to_stage(usd_path=root + "/Isaac/Environments/Grid/default_environment.usd", path="/World/ground")

SimulationManager.set_backend("torch")
SimulationManager.set_physics_sim_device("cuda")
SimulationManager.setup_simulation(dt=0.005)
RenderingManager.set_dt(0.02)

spec = get_go2_spec()
report["go2_usd"] = spec.usd_path
runner = RobotPolicyRunner(spec, prim_path="/World/Go2", position=[0.0, 0.0, 0.5])
runner.spawn()

so101_usd = root + "/Isaac/Robots/RobotStudio/so101_new_calib/so101_new_calib.usd"
stage_utils.add_reference_to_stage(usd_path=so101_usd, path="/World/SO101")
xf = UsdGeom.XformCommonAPI(stage.GetPrimAtPath("/World/SO101"))
xf.SetTranslate(Gf.Vec3d(0.0, 1.2, 0.0))
report["so101_usd"] = so101_usd

command = [0.8, 0.0, 0.0]  # vx, vy, yaw rate
state = {"ready": False, "failed": None}


def on_step(dt, _ctx):
    if state["failed"]:
        return
    try:
        if not state["ready"]:
            runner.restart_from_default_state(command)
            state["ready"] = True
        else:
            runner.step(dt, command)
    except Exception as e:  # noqa: BLE001
        state["failed"] = repr(e)


SimulationManager.register_callback(on_step, IsaacEvents.POST_PHYSICS_STEP)

cam = rep.create.camera(position=(1.5, -3.5, 1.6), look_at=(1.5, 0.4, 0.3))
rp = rep.create.render_product(cam, (1280, 720))
rgb = rep.AnnotatorRegistry.get_annotator("rgb")
rgb.attach(rp)

omni.timeline.get_timeline_interface().play()
app.update()


def base_xy():
    pos, _ = runner.articulation.get_world_poses()
    p = pos.numpy() if hasattr(pos, "numpy") else np.asarray(pos)
    return p.reshape(-1, 3)[0].tolist()


start = base_xy()
for i in range(200):  # 200 render frames x 0.02 s = 4 s
    app.update()
end = base_xy()
report["go2_start"] = start
report["go2_end_after_4s"] = end
report["go2_dx_m"] = round(end[0] - start[0], 3)
report["go2_height_m"] = round(end[2], 3)
report["policy_error"] = state["failed"]

for _ in range(3):
    app.update()
img = rgb.get_data()
if img is not None and getattr(img, "size", 0):
    Image.fromarray(np.asarray(img)[:, :, :3]).save(os.path.join(OUT, "smoke_rgb.png"))
    report["rgb_shape"] = list(np.asarray(img).shape)

joints = [p.GetName() for p in Usd.PrimRange(stage.GetPrimAtPath("/World/SO101")) if p.IsA(UsdPhysics.RevoluteJoint) or p.IsA(UsdPhysics.PrismaticJoint)]
report["so101_joints"] = joints
report["elapsed_s"] = round(time.time() - t0, 1)
try:
    import resource

    report["max_rss_gb"] = round(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024 / 1024, 2)
except Exception:  # noqa: BLE001
    pass

print("[phase1] REPORT " + json.dumps(report, ensure_ascii=False), flush=True)
with open(os.path.join(OUT, "report.json"), "w") as f:
    json.dump(report, f, indent=2, ensure_ascii=False)
omni.timeline.get_timeline_interface().stop()
app.close()
