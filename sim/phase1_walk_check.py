"""Go2 보행 정책이 평지에서 넘어지지 않고 걷는지 확인."""
import json, os
from isaacsim import SimulationApp

app = SimulationApp({"headless": True})
import sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sim_common import Go2Walker, enable_extensions, physics_material, setup_physics
enable_extensions(["isaacsim.robot.policy.examples", "isaacsim.storage.native", "omni.replicator.core"])
import omni.replicator.core as rep
import numpy as np
from PIL import Image
import omni.timeline, omni.usd
import isaacsim.core.experimental.utils.stage as stage_utils
from isaacsim.core.simulation_manager import SimulationManager
from isaacsim.storage.native import get_assets_root_path

root = get_assets_root_path()
omni.usd.get_context().new_stage()
stage = omni.usd.get_context().get_stage()
stage_utils.set_stage_up_axis("Z"); stage_utils.set_stage_units(meters_per_unit=1.0)
SimulationManager.set_backend("torch"); SimulationManager.set_physics_sim_device("cuda")
stage_utils.add_reference_to_stage(usd_path=root + "/Isaac/Environments/Grid/default_environment.usd", path="/World/ground")
physics_material(stage, "/World/ground/Looks/PhysicsMaterial", ["/World/ground/GroundPlane/CollisionPlane"])
go2 = Go2Walker(position=(0.0, 0.0, 0.4)); go2.spawn()
dt = setup_physics(app)
go2.attach()
cam = rep.create.camera(position=(1.2, -2.6, 0.7), look_at=(1.2, 0.0, 0.25))
rp = rep.create.render_product(cam, (960, 540)); ann = rep.AnnotatorRegistry.get_annotator("rgb"); ann.attach(rp)
omni.timeline.get_timeline_interface().play(); app.update()
log = []
for i in range(300):  # 6 s
    t = i * 0.02
    go2.command[:] = [0.0, 0.0, 0.0] if t < 1.0 else ([0.6, 0.0, 0.0] if t < 4.0 else [0.0, 0.0, 0.8])
    app.update()
    if i in (40, 140, 280):
        Image.fromarray(np.asarray(ann.get_data())[:, :, :3]).save(f"{os.path.dirname(os.path.abspath(__file__))}/output/walk_{i}.png")
    if i % 25 == 0:
        p, yaw = go2.pose(); log.append([round(t, 2), *[round(v, 3) for v in p], round(yaw, 2)])
print("[walk] dt", dt, "error", go2.error)
print("[walk] LOG " + json.dumps(log))
app.close()
