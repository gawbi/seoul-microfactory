import os
from isaacsim import SimulationApp
app = SimulationApp({"headless": True})
import omni.usd
from isaacsim.storage.native import get_assets_root_path
from pxr import Usd, UsdGeom
root = get_assets_root_path()
for n in ["003_cracker_box", "005_tomato_soup_can", "006_mustard_bottle"]:
    st = Usd.Stage.Open(f"{root}/Isaac/Props/YCB/Axis_Aligned/{n}.usd")
    bb = UsdGeom.BBoxCache(Usd.TimeCode.Default(), ["default", "render"]).ComputeWorldBound(st.GetPseudoRoot()).ComputeAlignedRange()
    print("[ycb]", n, "mpu", UsdGeom.GetStageMetersPerUnit(st), "up", UsdGeom.GetStageUpAxis(st), "min", [round(v,3) for v in bb.GetMin()], "max", [round(v,3) for v in bb.GetMax()], "default", st.GetDefaultPrim().GetPath())
app.close()
