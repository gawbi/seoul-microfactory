"""보행 정책 회전 안정성 진단: 명령 변화 방식별로 넘어지는지 기울기를 기록."""
import json, math, os, sys
from isaacsim import SimulationApp
app = SimulationApp({"headless": True})
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from sim_common import Go2Walker, enable_extensions, physics_material, setup_physics
enable_extensions(["isaacsim.robot.policy.examples", "isaacsim.storage.native"])
import numpy as np, omni.timeline, omni.usd
import isaacsim.core.experimental.utils.stage as stage_utils
from isaacsim.core.simulation_manager import SimulationManager
from isaacsim.storage.native import get_assets_root_path
root = get_assets_root_path()
omni.usd.get_context().new_stage(); stage = omni.usd.get_context().get_stage()
stage_utils.set_stage_up_axis("Z"); stage_utils.set_stage_units(meters_per_unit=1.0)
SimulationManager.set_backend("torch"); SimulationManager.set_physics_sim_device("cuda")
stage_utils.add_reference_to_stage(usd_path=root + "/Isaac/Environments/Grid/default_environment.usd", path="/World/ground")
physics_material(stage, "/World/ground/Looks/PhysicsMaterial", ["/World/ground/GroundPlane/CollisionPlane"])
bots = {}
cases = {"abrupt_y1.0": (0, 1.0, False), "ramped_y1.0": (3, 1.0, True), "ramped_y0.6": (6, 0.6, True)}
for name, (ox, _, _) in cases.items():
    g = Go2Walker(prim_path=f"/World/Go2_{ox}", position=(0.0, float(ox), 0.4)); g.spawn(); bots[name] = g
setup_physics(app)
for g in bots.values(): g.attach()
omni.timeline.get_timeline_interface().play()
def tilt(g):
    pos, quat = g.runner.articulation.get_world_poses()
    q = (quat.numpy() if hasattr(quat, "numpy") else np.asarray(quat)).reshape(-1, 4)[0]
    w, x, y, z = q
    roll = math.atan2(2*(w*x+y*z), 1-2*(x*x+y*y)); pitch = math.asin(max(-1, min(1, 2*(w*y-z*x))))
    return round(math.degrees(roll), 1), round(math.degrees(pitch), 1)
log = {n: [] for n in cases}
cmd = {n: [0.0, 0.0, 0.0] for n in cases}
for i in range(400):
    t = i * 0.02
    for n, (ox, yr, ramp) in cases.items():
        target = [0.0, 0.0, 0.0] if t < 1 else ([0.5, 0.0, 0.0] if t < 3 else [0.2, 0.0, -yr])
        if ramp:
            cmd[n] = [c + max(-0.04, min(0.04, tg - c)) for c, tg in zip(cmd[n], target)]
        else:
            cmd[n] = target
        bots[n].command[:] = cmd[n]
    app.update()
    if i % 25 == 0:
        for n, g in bots.items():
            p, yaw = g.pose(); log[n].append([round(t, 1), round(float(p[0]), 2), round(float(p[1]), 2), round(yaw, 2), *tilt(g)])
for n in cases: print("[diag]", n, json.dumps(log[n]))
app.close()
