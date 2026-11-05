from isaacsim import SimulationApp
app = SimulationApp({"headless": True})
import numpy as np, omni.usd
from isaacsim.storage.native import get_assets_root_path
from pxr import Usd, UsdGeom, Gf
root = get_assets_root_path()
omni.usd.get_context().new_stage(); stage = omni.usd.get_context().get_stage()
p = stage.DefinePrim("/World/SO101", "Xform"); p.GetReferences().AddReference(root + "/Isaac/Robots/RobotStudio/so101_new_calib/so101_new_calib.usd")
app.update()
xc = UsdGeom.XformCache()
G = xc.GetLocalToWorldTransform(stage.GetPrimAtPath("/World/SO101/gripper")).GetInverse()
for link in ["gripper", "moving_jaw_so101_v1"]:
    for kind in ["collisions", "visuals"]:
        pts = []
        for m in Usd.PrimRange(stage.GetPrimAtPath(f"/World/SO101/{link}/{kind}"), Usd.TraverseInstanceProxies()):
            if m.IsA(UsdGeom.Mesh):
                M = xc.GetLocalToWorldTransform(m) * G
                for q in UsdGeom.Mesh(m).GetPointsAttr().Get() or []:
                    pts.append(list(M.Transform(Gf.Vec3d(*q))))
        if not pts:
            print("[fg]", link, kind, "no mesh"); continue
        P = np.array(pts)
        f = P[P[:, 2] < -0.06]
        print("[fg]", link, kind, "n", len(P), "finger(z<-0.06) x", f[:, 0].min().round(4), f[:, 0].max().round(4), "y", f[:, 1].min().round(4), f[:, 1].max().round(4), "z", f[:, 2].min().round(4))
        for zc in (-0.095, -0.085, -0.075):
            s = P[(P[:, 2] > zc - 0.005) & (P[:, 2] < zc + 0.005)]
            if len(s): print("[fg]   slice z", zc, "x", s[:, 0].min().round(4), s[:, 0].max().round(4))
app.close()
