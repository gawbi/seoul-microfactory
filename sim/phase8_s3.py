"""S3(공간 재구성) 장면만 다시 렌더링. PHASE 4에서 저장한 시뮬레이션 LiDAR 클라우드를 쓴다."""
import json, math, os, sys
from isaacsim import SimulationApp
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "output", "film", "s3new")
os.makedirs(OUT, exist_ok=True)
RES = (1600, 900)
app = SimulationApp({"headless": True})
sys.path.insert(0, HERE)
from sim_common import enable_extensions
enable_extensions(["isaacsim.storage.native", "omni.replicator.core"])
import numpy as np, omni.usd, omni.replicator.core as rep
import isaacsim.core.experimental.utils.stage as stage_utils
from isaacsim.storage.native import get_assets_root_path
from PIL import Image
from pxr import Gf, Sdf, UsdGeom, UsdShade, Vt
from store_scene import build_store
root = get_assets_root_path()
omni.usd.get_context().new_stage(); stage = omni.usd.get_context().get_stage()
stage_utils.set_stage_up_axis("Z"); stage_utils.set_stage_units(meters_per_unit=1.0)
build_store(stage, root)
cloud = np.load(os.path.join(HERE, "output", "phase4", "cloud.npz"))["points"]


def emissive(path, color, k):
    m = UsdShade.Material.Define(stage, path); s = UsdShade.Shader.Define(stage, path + "/S")
    s.CreateIdAttr("UsdPreviewSurface")
    s.CreateInput("diffuseColor", Sdf.ValueTypeNames.Color3f).Set(Gf.Vec3f(*color))
    s.CreateInput("emissiveColor", Sdf.ValueTypeNames.Color3f).Set(Gf.Vec3f(*[c * k for c in color]))
    m.CreateSurfaceOutput().ConnectToSource(s.ConnectableAPI(), "surface"); return m


c = cloud[(cloud[:, 0] < 7.85) & (cloud[:, 1] < 5.9)]  # 카메라 쪽 벽 컷어웨이
BANDS = [((0.16, 0.3, 0.62), -1, 0.06, 4, 0.35), ((0.22, 0.5, 0.82), 0.06, 0.6, 1, 0.6), ((0.33, 0.75, 0.9), 0.6, 1.35, 1, 0.6), ((0.75, 0.92, 0.98), 1.35, 9, 1, 0.6)]
prims = []
for i, (col, z0, z1, every, k) in enumerate(BANDS):
    sel = c[(c[:, 2] >= z0) & (c[:, 2] < z1)][::every]
    pp = UsdGeom.Points.Define(stage, f"/World/CloudViz/B{i}")
    pp.CreatePointsAttr(Vt.Vec3fArray.FromNumpy(sel.astype(np.float32)))
    pp.CreateWidthsAttr(Vt.FloatArray.FromNumpy(np.full(len(sel), 0.016, np.float32)))
    UsdShade.MaterialBindingAPI.Apply(pp.GetPrim()).Bind(emissive(f"/World/CloudViz/Looks/B{i}", col, k))
    prims.append(pp)
cam = UsdGeom.Camera.Define(stage, "/World/FilmCam")
cam.CreateFocalLengthAttr(17.0); cam.CreateHorizontalApertureAttr(20.955); cam.CreateVerticalApertureAttr(20.955 * RES[1] / RES[0])
cam.CreateClippingRangeAttr(Gf.Vec2f(0.05, 100.0))
op = UsdGeom.Xformable(cam).AddTransformOp()
rp = rep.create.render_product("/World/FilmCam", RES)
ann = rep.AnnotatorRegistry.get_annotator("rgb"); ann.attach(rp)
store = UsdGeom.Imageable(stage.GetPrimAtPath("/World/Store"))
near = [UsdGeom.Imageable(stage.GetPrimAtPath(f"/World/Store/{n}")) for n in ("WallRight", "WallFrontL", "WallFrontR", "DoorHeader")]


def ease(s):
    return 0.5 - 0.5 * math.cos(math.pi * s)


def shot(i, tag):
    for _ in range(2):
        app.update()
    for _ in range(60):
        d = np.asarray(ann.get_data())
        if d.ndim == 3:
            break
        app.update()
    Image.fromarray(np.asarray(ann.get_data())[:, :, :3]).save(os.path.join(OUT, f"{tag}_{i:04d}.jpg"), quality=93)


import omni.timeline
omni.timeline.get_timeline_interface().play()
for _ in range(10):
    app.update()
for i in range(175):
    s = ease(i / 174)
    ang = math.radians(-60 + 55 * s)  # 오른쪽 앞(입구 쪽) 위에서 시작해 오른쪽으로 회전
    r, h = 6.8 - 0.6 * s, 7.4 - 1.6 * s
    eye = Gf.Vec3d(4.0 + r * math.cos(ang), 3.0 + r * math.sin(ang) * -1 + 1.2, h)
    m = Gf.Matrix4d().SetLookAt(eye, Gf.Vec3d(4.0, 2.7, 0.2), Gf.Vec3d(0, 0, 1)).GetInverse()
    op.Set(m)
    store.MakeInvisible()
    shot(i, "cloud")
    if i >= 135:
        store.MakeVisible()
        for w in near:
            w.MakeInvisible()
        shot(i, "world")
        for w in near:
            w.MakeVisible()
print("[s3] done", len(c))
json.dump({"cloud_points_shown": int(len(c)), "cloud_points_total": int(len(cloud))}, open(os.path.join(OUT, "info.json"), "w"))
app.close()
