import os
from isaacsim import SimulationApp
app = SimulationApp({"headless": True})
import omni.usd
from isaacsim.storage.native import get_assets_root_path
from pxr import Usd, UsdGeom, Gf
root = get_assets_root_path()
omni.usd.get_context().new_stage(); stage = omni.usd.get_context().get_stage()
UsdGeom.SetStageUpAxis(stage, "Z")
p = stage.DefinePrim("/World/SO101", "Xform"); p.GetReferences().AddReference(root + "/Isaac/Robots/RobotStudio/so101_new_calib/so101_new_calib.usd")
app.update()
bc = UsdGeom.BBoxCache(Usd.TimeCode.Default(), ["default", "render", "proxy", "guide"], useExtentsHint=False)
xc = UsdGeom.XformCache()
g = stage.GetPrimAtPath("/World/SO101/gripper"); j = stage.GetPrimAtPath("/World/SO101/moving_jaw_so101_v1"); w = stage.GetPrimAtPath("/World/SO101/wrist")
for name, prim in [("gripper", g), ("jaw", j)]:
    rng = bc.ComputeRelativeBound(prim, g).ComputeAlignedRange()
    print("[gp]", name, "bbox in gripper frame min", [round(v, 4) for v in rng.GetMin()], "max", [round(v, 4) for v in rng.GetMax()])
Mg = xc.GetLocalToWorldTransform(g)
print("[gp] gripper world origin", [round(v, 4) for v in Mg.ExtractTranslation()])
print("[gp] gripper world axes x,y,z", [[round(v, 3) for v in Mg.TransformDir(Gf.Vec3d(*a))] for a in [(1,0,0),(0,1,0),(0,0,1)]])
print("[gp] jaw origin in gripper frame", [round(v, 4) for v in (Mg.GetInverse().Transform(xc.GetLocalToWorldTransform(j).ExtractTranslation()))])
print("[gp] wrist origin in gripper frame", [round(v, 4) for v in (Mg.GetInverse().Transform(xc.GetLocalToWorldTransform(w).ExtractTranslation()))])
print("[gp] children", [c.GetName() for c in g.GetChildren()])
app.close()
