"""PHASE 2: 가상 매장 구축 + Go2 Ent-MTPTZ(짐벌 페이로드) 배치, 정지 화면 렌더링.

출력: sim/output/phase2/*.png, sim/output/phase2/store_scene.usd
"""
import json
import os
import sys

from isaacsim import SimulationApp

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "output", "phase2")
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
from pxr import Usd, UsdPhysics  # noqa: E402
from ptz_payload import PTZPayload  # noqa: E402
from store_scene import build_store  # noqa: E402

root = get_assets_root_path()
omni.usd.get_context().new_stage()
stage = omni.usd.get_context().get_stage()
stage_utils.set_stage_up_axis("Z")
stage_utils.set_stage_units(meters_per_unit=1.0)
SimulationManager.set_backend("torch")
SimulationManager.set_physics_sim_device("cuda")

info = build_store(stage, root)
physics_material(stage, "/World/Store/Looks/FloorPhysics", ["/World/Store/Floor"])

go2 = Go2Walker(position=(3.8, 6.9, 0.4), yaw=-np.pi / 2)  # 입구 앞, 매장 안쪽(-y)을 바라봄
go2.spawn()
links = [p.GetPath().pathString for p in Usd.PrimRange(stage.GetPrimAtPath("/World/Go2")) if p.HasAPI(UsdPhysics.RigidBodyAPI)]
base = next((l for l in links if l.endswith("/base")), links[0])
print("[phase2] go2 links:", len(links), "base:", base, flush=True)
ptz = PTZPayload(stage, base)

dt = setup_physics(app)
go2.attach()

shots = {
    "overview": ((7.7, 5.8, 2.55), (3.2, 2.2, 0.4)),
    "entrance": ((2.4, 3.6, 1.2), (3.8, 5.6, 0.35)),
    "aisle": ((0.9, 5.4, 1.5), (2.6, 1.2, 0.6)),
    "worktable": ((5.6, 3.0, 1.6), (7.1, 1.7, 0.85)),
}
products = {}
for name, (pos, look) in shots.items():
    cam = rep.create.camera(position=pos, look_at=look, focal_length=18.0)
    rp = rep.create.render_product(cam, (1280, 720))
    ann = rep.AnnotatorRegistry.get_annotator("rgb")
    ann.attach(rp)
    products[name] = ann
gimbal_rp = rep.create.render_product(ptz.camera_path, (960, 540))
gimbal_ann = rep.AnnotatorRegistry.get_annotator("rgb")
gimbal_ann.attach(gimbal_rp)

omni.timeline.get_timeline_interface().play()
for i in range(60):  # 1.2 s 안정화
    app.update()
go2.command[:] = [0.5, 0.0, 0.0]  # 입구 안으로 걸어 들어감 (물리 기반 보행 정책)
for i in range(150):
    app.update()
go2.command[:] = [0.0, 0.0, 0.0]
for i in range(40):
    app.update()
ptz.set(-35.0, 10.0)
for i in range(10):
    app.update()

for name, ann in {**products, "gimbal_view": gimbal_ann}.items():
    img = np.asarray(ann.get_data())
    Image.fromarray(img[:, :, :3]).save(os.path.join(OUT, f"{name}.png"))

p, yaw = go2.pose()
report = {"physics_dt": dt, "go2_pose": [round(v, 3) for v in p], "go2_yaw": round(yaw, 3), "policy_error": go2.error, "base_link": base, "store": info["size"]}
print("[phase2] REPORT " + json.dumps(report), flush=True)
omni.timeline.get_timeline_interface().stop()
app.update()
stage.GetRootLayer().Export(os.path.join(OUT, "store_scene.usda"))
app.close()
