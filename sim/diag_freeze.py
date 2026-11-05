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
from pxr import PhysxSchema, Usd, UsdPhysics
root = get_assets_root_path()
omni.usd.get_context().new_stage(); stage = omni.usd.get_context().get_stage()
stage_utils.set_stage_up_axis("Z"); stage_utils.set_stage_units(meters_per_unit=1.0)
SimulationManager.set_backend("torch"); SimulationManager.set_physics_sim_device("cuda")
stage_utils.add_reference_to_stage(usd_path=root + "/Isaac/Environments/Grid/default_environment.usd", path="/World/ground")
physics_material(stage, "/World/ground/Looks/PhysicsMaterial", ["/World/ground/GroundPlane/CollisionPlane"])
g = Go2Walker(position=(0.0, 0.0, 0.4)); g.spawn()
roots = [(p.GetPath().pathString, PhysxSchema.PhysxArticulationAPI(p).GetSleepThresholdAttr().Get()) for p in Usd.PrimRange(stage.GetPrimAtPath("/World/Go2")) if p.HasAPI(UsdPhysics.ArticulationRootAPI)]
print("[frz] articulation roots", roots, "instanceable?", stage.GetPrimAtPath("/World/Go2").IsInstanceable())
setup_physics(app); g.attach()
omni.timeline.get_timeline_interface().play()
art = g.runner.articulation
def arr(x):
    return (x.numpy() if hasattr(x, "numpy") else np.asarray(x)).reshape(-1)
rows = []
for i in range(400):
    t = i * 0.02
    g.command[:] = [0.0, 0.0, 0.0] if t < 1 else ([0.5, 0.0, 0.0] if t < 3 else [0.2, 0.0, -1.0])
    app.update()
    if i % 25 == 0:
        p, yaw = g.pose()
        v = arr(art.get_dof_velocities()); q = arr(art.get_dof_positions())
        try:
            tg = arr(art.get_dof_position_targets())
        except Exception as e:
            tg = np.zeros(1)
        rows.append([round(t, 1), round(float(p[0]), 2), round(yaw, 2), round(float(np.abs(v).max()), 3), round(float(np.abs(tg - q).max()), 3), round(float(tg.sum()), 3)])
print("[frz] t,x,yaw,|vel|max,|target-pos|max,sum(target)")
for r in rows: print("[frz]", r)
print("[frz] valid", art.is_physics_tensor_entity_valid(), "err", g.error)
app.close()
