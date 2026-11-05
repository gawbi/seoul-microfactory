"""SO-101 구조 탐색: 링크/관절 이름, 관절 범위, 드라이브 게인, 그리퍼 기준점, 자코비안 형태."""
import json, os, sys
from isaacsim import SimulationApp
app = SimulationApp({"headless": True})
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from sim_common import enable_extensions, setup_physics
enable_extensions(["isaacsim.storage.native"])
import numpy as np, omni.timeline, omni.usd
import isaacsim.core.experimental.utils.stage as stage_utils
from isaacsim.core.experimental.prims import Articulation
from isaacsim.core.simulation_manager import SimulationManager
from isaacsim.storage.native import get_assets_root_path
from pxr import Gf, Usd, UsdGeom, UsdPhysics
root = get_assets_root_path()
omni.usd.get_context().new_stage(); stage = omni.usd.get_context().get_stage()
stage_utils.set_stage_up_axis("Z"); stage_utils.set_stage_units(meters_per_unit=1.0)
SimulationManager.set_backend("torch"); SimulationManager.set_physics_sim_device("cuda")
stage_utils.add_reference_to_stage(usd_path=root + "/Isaac/Environments/Grid/default_environment.usd", path="/World/ground")
stage_utils.add_reference_to_stage(usd_path=root + "/Isaac/Robots/RobotStudio/so101_new_calib/so101_new_calib.usd", path="/World/SO101")
tree = []
for p in Usd.PrimRange(stage.GetPrimAtPath("/World/SO101")):
    tags = [n for n, api in [("ART", UsdPhysics.ArticulationRootAPI), ("RB", UsdPhysics.RigidBodyAPI), ("COL", UsdPhysics.CollisionAPI)] if p.HasAPI(api)]
    if p.IsA(UsdPhysics.Joint): tags.append("JOINT:" + p.GetTypeName())
    if tags or p.GetTypeName() in ("Xform",) and p.GetPath().pathString.count("/") <= 4:
        tree.append(f"{p.GetPath().pathString} {p.GetTypeName()} {tags}")
print("[so] PRIMS\n" + "\n".join(tree[:80]))
for p in Usd.PrimRange(stage.GetPrimAtPath("/World/SO101")):
    if p.IsA(UsdPhysics.RevoluteJoint) or p.IsA(UsdPhysics.PrismaticJoint):
        j = UsdPhysics.RevoluteJoint(p) if p.IsA(UsdPhysics.RevoluteJoint) else UsdPhysics.PrismaticJoint(p)
        drv = UsdPhysics.DriveAPI.Get(p, "angular" if p.IsA(UsdPhysics.RevoluteJoint) else "linear")
        print("[so] JOINT", p.GetName(), "axis", j.GetAxisAttr().Get(), "lim", j.GetLowerLimitAttr().Get(), j.GetUpperLimitAttr().Get(),
              "kp", drv.GetStiffnessAttr().Get() if drv else None, "kd", drv.GetDampingAttr().Get() if drv else None, "maxF", drv.GetMaxForceAttr().Get() if drv else None,
              "b0", j.GetBody0Rel().GetTargets(), "b1", j.GetBody1Rel().GetTargets())
setup_physics(app, physics_dt=1 / 120, rendering_dt=1 / 60)
omni.timeline.get_timeline_interface().play(); app.update(); app.update()
art_path = [p.GetPath().pathString for p in Usd.PrimRange(stage.GetPrimAtPath("/World/SO101")) if p.HasAPI(UsdPhysics.ArticulationRootAPI)][0]
art = Articulation(art_path)
for _ in range(5): app.update()
print("[so] art", art_path, "dofs", art.dof_names, "links", art.link_names)
J = art.get_jacobian_matrices(); print("[so] jacobian shape", tuple(J.shape))
lim = art.get_dof_limits(); print("[so] limits", np.asarray(lim[0].numpy() if hasattr(lim[0], 'numpy') else lim[0]).round(3).tolist(), np.asarray(lim[1].numpy() if hasattr(lim[1], 'numpy') else lim[1]).round(3).tolist())
xc = UsdGeom.XformCache()
for l in art.link_names:
    pr = [p for p in Usd.PrimRange(stage.GetPrimAtPath("/World/SO101")) if p.GetName() == l]
    if pr:
        m = xc.GetLocalToWorldTransform(pr[0]); print("[so] link", l, [round(v, 3) for v in m.ExtractTranslation()])
app.close()
