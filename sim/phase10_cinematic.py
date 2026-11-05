"""PHASE 10: 사이트용 시네마틱 렌더 (Isaac Sim 6.2, RTX 패스 트레이싱).

PHASE 3~8과 같은 매장·로봇·정책을 쓰고, 조명과 카메라만 영화 촬영처럼 바꾼다.
  - 조명: 영업이 끝난 밤 매장 (통로 조명 일부, 냉장 쇼케이스, 작업등)
  - 카메라: 낮은 앵글, 망원 렌즈, 피사계 심도 (USD Camera fStop / focusDistance)
  - Go2: 번들 보행 정책으로 실제 물리 보행. 정지 컷은 보행 중 타임라인을 멈추고 누적 렌더
  - 포인트 클라우드: PHASE 4에서 시뮬레이션 LiDAR로 얻은 cloud.npz를 그대로 표시

모드
  test  : 해상도를 낮춰 실시간 RTX와 패스 트레이싱 한 장씩 (조명·속도 확인)
  aisle : 통로를 걸어오는 Go2 영상 프레임 + 정지 컷 (통로, 짐벌 근접)
  door  : 밤에 매장 입구로 들어서는 Go2 정지 컷
  arm   : SO-101 근접 컷 + 포인트 클라우드 컷
출력: sim/output/cinematic/<mode>/
"""
import json
import math
import os
import sys
import time

from isaacsim import SimulationApp

MODE = sys.argv[1] if len(sys.argv) > 1 else "test"
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "output", "cinematic", MODE)
os.makedirs(OUT, exist_ok=True)
app = SimulationApp({"headless": True})
sys.path.insert(0, HERE)
from sim_common import Go2Walker, enable_extensions, physics_material, setup_physics  # noqa: E402

enable_extensions(["isaacsim.robot.policy.examples", "isaacsim.storage.native", "omni.replicator.core", "isaacsim.robot.poser"])
import carb  # noqa: E402
import numpy as np  # noqa: E402
import omni.replicator.core as rep  # noqa: E402
import omni.timeline  # noqa: E402
import omni.usd  # noqa: E402
import isaacsim.core.experimental.utils.stage as stage_utils  # noqa: E402
from isaacsim.core.simulation_manager import SimulationManager  # noqa: E402
from isaacsim.storage.native import get_assets_root_path  # noqa: E402
from PIL import Image  # noqa: E402
from pxr import Gf, Sdf, Usd, UsdGeom, UsdLux, UsdPhysics, UsdShade, Vt  # noqa: E402
from ptz_payload import PTZPayload  # noqa: E402
from store_scene import TABLE, _box, _material, build_store  # noqa: E402

settings = carb.settings.get_settings()
TOP = TABLE[4]
ARM_BASE = np.array([7.15, 2.25, TOP])
PICK = ARM_BASE + np.array([-0.06, -0.19, 0.0])
PLACE = ARM_BASE + np.array([0.11, -0.17, 0.0])
OBJ = 0.03
TOOL_LOCAL = np.array([0.014, 0.0, -0.093])

root = get_assets_root_path()
omni.usd.get_context().new_stage()
stage = omni.usd.get_context().get_stage()
stage_utils.set_stage_up_axis("Z")
stage_utils.set_stage_units(meters_per_unit=1.0)
SimulationManager.set_backend("torch")
SimulationManager.set_physics_sim_device("cuda")
build_store(stage, root)
physics_material(stage, "/World/Store/Looks/FloorPhysics", ["/World/Store/Floor", "/World/Store/WorkTable/Top"])


# ---------------- 밤 매장 분위기 ----------------
def shader_input(mat_path, name, value, tn=Sdf.ValueTypeNames.Color3f):
    sh = UsdShade.Shader(stage.GetPrimAtPath(mat_path + "/Shader"))
    if not sh:
        sh = UsdShade.Shader(next(p for p in Usd.PrimRange(stage.GetPrimAtPath(mat_path)) if p.IsA(UsdShade.Shader)))
    sh.CreateInput(name, tn).Set(value)


L = "/World/Store/Looks"
shader_input(f"{L}/Floor", "diffuseColor", Gf.Vec3f(0.16, 0.165, 0.17))
shader_input(f"{L}/Floor", "roughness", 0.16, Sdf.ValueTypeNames.Float)
shader_input(f"{L}/Wall", "diffuseColor", Gf.Vec3f(0.42, 0.42, 0.41))
shader_input(f"{L}/Sidewalk", "diffuseColor", Gf.Vec3f(0.2, 0.2, 0.21))

LI = "/World/Store/Lights"
UsdLux.DomeLight(stage.GetPrimAtPath(f"{LI}/Ambient")).GetIntensityAttr().Set(18.0)
UsdLux.DomeLight(stage.GetPrimAtPath(f"{LI}/Ambient")).GetColorAttr().Set(Gf.Vec3f(0.45, 0.58, 0.95))
for i in range(6):
    lt = UsdLux.RectLight(stage.GetPrimAtPath(f"{LI}/Panel{i}"))
    lt.GetIntensityAttr().Set(7000.0 if i in (0, 2, 4) else 900.0)
    lt.GetColorTemperatureAttr().Set(4100.0)
UsdLux.RectLight(stage.GetPrimAtPath(f"{LI}/CoolerInner")).GetIntensityAttr().Set(14000.0)
task = UsdLux.SphereLight(stage.GetPrimAtPath(f"{LI}/TaskLamp"))
task.GetIntensityAttr().Set(30000.0)
task.GetColorTemperatureAttr().Set(3000.0)
# 입구 밖 가로등 (차가운 LED)
street = UsdLux.SphereLight.Define(stage, f"{LI}/Street")
street.CreateRadiusAttr(0.15)
street.CreateIntensityAttr(160000.0)
street.CreateColorTemperatureAttr(6200.0)
street.CreateEnableColorTemperatureAttr(True)
UsdGeom.XformCommonAPI(street).SetTranslate(Gf.Vec3d(6.2, 8.8, 4.2))


def emissive(path, color, strength=1.6, opacity=1.0):
    m = UsdShade.Material.Define(stage, path)
    s = UsdShade.Shader.Define(stage, path + "/S")
    s.CreateIdAttr("UsdPreviewSurface")
    s.CreateInput("diffuseColor", Sdf.ValueTypeNames.Color3f).Set(Gf.Vec3f(*color))
    s.CreateInput("emissiveColor", Sdf.ValueTypeNames.Color3f).Set(Gf.Vec3f(*[c * strength for c in color]))
    if opacity < 1:
        s.CreateInput("opacity", Sdf.ValueTypeNames.Float).Set(opacity)
    m.CreateSurfaceOutput().ConnectToSource(s.ConnectableAPI(), "surface")
    return m


# 문 위 간판 띠 (밖에서 보이는 빛)
_box(stage, "/World/Props/SignBand", 2.6, 6.125, 2.32, 5.0, 6.16, 2.5, emissive("/World/Props/Looks/Sign", (0.95, 0.96, 0.92), 3.0), collide=False)

# ---------------- 포인트 클라우드 (PHASE 4 결과) ----------------
cloud = np.load(os.path.join(HERE, "output", "phase4", "cloud.npz"))["points"].astype(np.float32)
cloud_prim = UsdGeom.Points.Define(stage, "/World/Cloud/Points")
cloud_prim.CreatePointsAttr(Vt.Vec3fArray())
cloud_prim.CreateWidthsAttr(Vt.FloatArray())
UsdShade.MaterialBindingAPI.Apply(cloud_prim.GetPrim()).Bind(emissive("/World/Cloud/Looks/P", (0.55, 0.85, 0.95), 1.3))


def show_cloud(pts, width=0.01):
    cloud_prim.GetPointsAttr().Set(Vt.Vec3fArray.FromNumpy(np.ascontiguousarray(pts, np.float32)))
    cloud_prim.GetWidthsAttr().Set(Vt.FloatArray.FromNumpy(np.full(len(pts), width, np.float32)))


# ---------------- 로봇 ----------------
SPAWN = {
    "test": ((4.3, 1.35), math.pi),
    "aisle": ((4.6, 1.35), math.pi),
    "door": ((3.75, 8.3), -math.pi / 2),
    "arm": ((5.6, 2.6), math.pi * 0.85),
}[MODE]
go2 = Go2Walker(position=(SPAWN[0][0], SPAWN[0][1], 0.4), yaw=SPAWN[1])
go2.spawn()
ptz = PTZPayload(stage, "/World/Go2/base")

arm = None
if MODE == "arm":
    from isaacsim.core.experimental.prims import Articulation  # noqa: E402
    from isaacsim.robot.poser import RobotPoser, Transform  # noqa: E402

    arm_prim = stage.DefinePrim("/World/SO101", "Xform")
    arm_prim.GetReferences().AddReference(root + "/Isaac/Robots/RobotStudio/so101_new_calib/so101_new_calib.usd")
    xf = UsdGeom.Xformable(arm_prim)
    [op for op in xf.GetOrderedXformOps() if op.GetOpType() == UsdGeom.XformOp.TypeTranslate][0].Set(Gf.Vec3d(*ARM_BASE.tolist()))
    for jp in Usd.PrimRange(arm_prim):
        if jp.IsA(UsdPhysics.FixedJoint) and not UsdPhysics.FixedJoint(jp).GetBody0Rel().GetTargets():
            UsdPhysics.FixedJoint(jp).GetLocalPos0Attr().Set(Gf.Vec3f(*ARM_BASE.tolist()))
    tray_mat = _material(stage, "/World/Task/Looks/Tray", (0.12, 0.14, 0.17), roughness=0.5)
    px, py = PLACE[0], PLACE[1]
    _box(stage, "/World/Task/Tray/Bottom", px - 0.05, py - 0.045, TOP, px + 0.05, py + 0.045, TOP + 0.004, tray_mat)
    for i, (x0, y0, x1, y1) in enumerate([(px - 0.05, py - 0.045, px + 0.05, py - 0.04), (px - 0.05, py + 0.04, px + 0.05, py + 0.045), (px - 0.05, py - 0.045, px - 0.045, py + 0.045), (px + 0.045, py - 0.045, px + 0.05, py + 0.045)]):
        _box(stage, f"/World/Task/Tray/Rim{i}", x0, y0, TOP, x1, y1, TOP + 0.016, tray_mat)
    cube = UsdGeom.Cube.Define(stage, "/World/Task/Object")
    cube.CreateSizeAttr(OBJ)
    UsdGeom.XformCommonAPI(cube).SetTranslate(Gf.Vec3d(PICK[0], PICK[1], TOP + OBJ / 2 + 0.001))
    UsdGeom.XformCommonAPI(cube).SetRotate(Gf.Vec3f(0, 0, math.degrees(math.atan2(PICK[1] - ARM_BASE[1], PICK[0] - ARM_BASE[0]) + math.pi / 2)))
    UsdShade.MaterialBindingAPI.Apply(cube.GetPrim()).Bind(_material(stage, "/World/Task/Looks/Obj", (0.85, 0.42, 0.12), roughness=0.45))
    UsdPhysics.RigidBodyAPI.Apply(cube.GetPrim())
    UsdPhysics.CollisionAPI.Apply(cube.GetPrim())
    UsdPhysics.MassAPI.Apply(cube.GetPrim()).CreateMassAttr(0.02)

# ---------------- 촬영 카메라 ----------------
RES = (1280, 720) if MODE == "test" else (1920, 1080)
STILL_RES = (1280, 720) if MODE == "test" else (2560, 1440)
cam = UsdGeom.Camera.Define(stage, "/World/CineCam")
cam.CreateHorizontalApertureAttr(36.0)  # 풀프레임 기준
cam.CreateVerticalApertureAttr(36.0 * 9 / 16)
cam.CreateClippingRangeAttr(Gf.Vec2f(0.02, 200.0))
cam.CreateFStopAttr(0.0)
cam.CreateFocusDistanceAttr(3.0)
cam_op = UsdGeom.Xformable(cam).AddTransformOp()


def set_cam(eye, target, focal=50.0, fstop=0.0, focus=None):
    eye, target = np.asarray(eye, float), np.asarray(target, float)
    m = Gf.Matrix4d().SetLookAt(Gf.Vec3d(*eye), Gf.Vec3d(*target), Gf.Vec3d(0, 0, 1)).GetInverse()
    cam_op.Set(m)
    cam.GetFocalLengthAttr().Set(float(focal))
    # USD 카메라의 초점거리·조리개 단위는 "장면 단위의 1/10"이다. 이 씬은 미터 단위라 렌즈가 100배 크게 계산되므로
    # 실제 렌즈와 같은 심도를 얻으려면 f값에 100을 곱한다 (테스트 렌더로 확인).
    cam.GetFStopAttr().Set(float(fstop) * 100.0)
    cam.GetFocusDistanceAttr().Set(float(focus if focus is not None else np.linalg.norm(target - eye)))


rp = rep.create.render_product("/World/CineCam", RES)
ann = rep.AnnotatorRegistry.get_annotator("rgb")
ann.attach(rp)
cur = {"ann": ann, "rp": rp}


def use_still_res():
    """정지 컷용 고해상도 렌더 프로덕트로 바꾼다. annotator는 새로 만들어 붙인다."""
    cur["ann"].detach()
    cur["rp"].destroy()
    cur["rp"] = rep.create.render_product("/World/CineCam", STILL_RES)
    cur["ann"] = rep.AnnotatorRegistry.get_annotator("rgb")
    cur["ann"].attach(cur["rp"])
    # Replicator는 타임라인이 재생 중일 때 새 렌더 프로덕트를 초기화한다. 잠깐 돌렸다가 다시 멈춘다.
    timeline.play()
    for _ in range(4):
        go2.set_target([0.0, 0.0, 0.0])
        app.update()
    timeline.pause()


def realtime():
    settings.set("/rtx/rendermode", "RaytracedLighting")


def pathtrace(spp_frame, total):
    settings.set("/rtx/rendermode", "PathTracing")
    settings.set("/rtx/pathtracing/spp", spp_frame)
    settings.set("/rtx/pathtracing/totalSpp", total)
    settings.set("/rtx/pathtracing/maxBounces", 6)
    settings.set("/rtx/pathtracing/optixDenoiser/enabled", True)


def grab(path, quality=92):
    img = np.asarray(cur["ann"].get_data())
    if img.size:
        Image.fromarray(img[:, :, :3]).save(path, quality=quality)
        return True
    return False


timeline = omni.timeline.get_timeline_interface()
dt = setup_physics(app, physics_dt=0.005, rendering_dt=0.02)
go2.attach()
timeline.play()
for _ in range(30):
    app.update()

arm_q = None
if MODE == "arm":
    art_path = [p.GetPath().pathString for p in Usd.PrimRange(arm_prim) if p.HasAPI(UsdPhysics.ArticulationRootAPI)][0]
    arm = Articulation(art_path)
    poser = RobotPoser(stage, arm_prim, stage.GetPrimAtPath("/World/SO101/base"), stage.GetPrimAtPath("/World/SO101/gripper"))
    DOF = arm.dof_names
    d = PICK[:2] - ARM_BASE[:2]
    phi = math.atan2(d[1], d[0]) + math.pi / 2
    Rd = np.array([[0, 1, 0], [0, 0, 1], [1, 0, 0]], float)
    Rx = np.array([[1, 0, 0], [0, 0, -1], [0, 1, 0]], float)
    Rz = np.array([[math.cos(phi), -math.sin(phi), 0], [math.sin(phi), math.cos(phi), 0], [0, 0, 1]])
    R = Rz @ Rx @ Rd
    target = PICK + np.array([0, 0, 0.045])
    q = Gf.Matrix3d(*R.T.flatten().tolist()).ExtractRotation().GetQuat()
    res = poser.solve_ik(Transform(t=(target - R @ TOOL_LOCAL - ARM_BASE).tolist(), q=[q.GetReal(), *q.GetImaginary()]), tolerance=5e-4, w_rot=0.3, w_pos=1.0, iters=400)
    vals = {k.split("/")[-1]: v for k, v in res.joints.items()}
    arm_q = np.array([vals.get(n, 0.0) for n in DOF] if res.success else [0.0] * len(DOF))
    arm_q[5] = 0.5  # 집게 벌림
    print("[phase10] arm ik", res.success, arm_q.round(3).tolist(), flush=True)

report = {"mode": MODE, "renders": []}


def pose_xy():
    p, yaw = go2.pose()
    return p, yaw


def still(name, eye, target, focal, fstop, focus=None, spp=(32, 384), updates=None):
    """타임라인을 멈춘 상태에서 패스 트레이싱으로 누적 렌더."""
    set_cam(eye, target, focal, fstop, focus)
    pathtrace(*spp)
    t0 = time.time()
    for _ in range(updates or (spp[1] // spp[0] + 6)):
        app.update()
    ok = grab(os.path.join(OUT, f"{name}.jpg"), 94)
    report["renders"].append({"name": name, "ok": ok, "sec": round(time.time() - t0, 1), "spp": spp[1]})
    print("[phase10] still", name, ok, round(time.time() - t0, 1), "s", flush=True)


# ---------------- 모드별 촬영 ----------------
if MODE == "test":
    for _ in range(100):
        go2.set_target([0.38, 0.0, 0.0])
        app.update()
    p, yaw = pose_xy()
    eye, tgt = (0.9, 1.42, 0.32), (p[0], p[1], 0.36)
    show_cloud(cloud[(cloud[:, 0] > p[0] + 0.35) & ((cloud[:, 1] < 0.7) | (cloud[:, 1] > 1.95)) & (cloud[:, 2] > 0.08)])
    set_cam(eye, tgt, 50, 2.0)
    realtime()
    for _ in range(20):
        app.update()
    t0 = time.time()
    for _ in range(10):
        app.update()
    report["rt_per_frame"] = round((time.time() - t0) / 10, 3)
    grab(os.path.join(OUT, "rt.jpg"))
    timeline.pause()
    for fs in (0.0, 18.0, 180.0):
        still(f"pt_f{int(fs)}", eye, tgt, 50, fs, spp=(16, 96))

elif MODE == "aisle":
    # 1) 영상: 통로를 걸어오는 Go2, 낮은 카메라가 천천히 뒤로 물러난다 (25 fps, 프레임마다 패스 트레이싱 16 spp + 디노이저)
    FR = os.path.join(OUT, "frames")
    os.makedirs(FR, exist_ok=True)
    pathtrace(16, 16)
    CL = cloud[((cloud[:, 1] < 0.7) | (cloud[:, 1] > 1.95)) & (cloud[:, 2] > 0.08)][::2]
    n_frames, k = 160, 0
    for step in range(n_frames * 2):
        t = step * 0.02
        go2.set_target([0.36, 0.0, 0.0] if t > 0.4 else [0.0, 0.0, 0.0])
        ptz.set(55.0 * math.sin(t * 0.9 + 0.6), 6.0 * math.sin(t * 0.5) - 6.0)
        p, yaw = pose_xy()
        s = step / (n_frames * 2)
        # 로봇 앞쪽 비스듬한 자리에서 같이 물러나는 트래킹 (정면보다 다리 모양이 자연스럽다)
        if step == 0:
            cam_x = p[0] - 1.05
        cam_x += (p[0] - 1.05 - cam_x) * 0.08
        eye = np.array([cam_x, 2.0, 0.32 + 0.03 * s])
        tgt = np.array([p[0] + 0.05, p[1], 0.42])
        sel = (CL[:, 0] > p[0] + 0.4)
        if step % 2 == 0:
            show_cloud(CL[sel], 0.0055)
        set_cam(eye, tgt, 32, 2.0, focus=float(np.linalg.norm(eye[:2] - p[:2])))
        app.update()
        if step % 2 == 1:
            grab(os.path.join(FR, f"{k:04d}.jpg"), 93)
            k += 1
    report["video_frames"] = k
    report["go2_end"] = [round(float(v), 3) for v in pose_xy()[0]]
    # 2) 정지 컷: 잠깐 멈춰 선 뒤 타임라인 일시정지
    for _ in range(60):
        go2.set_target([0.0, 0.0, 0.0])
        ptz.set(40.0, -8.0)
        app.update()
    p, yaw = pose_xy()
    timeline.pause()
    use_still_res()
    show_cloud(CL[CL[:, 0] > p[0] + 0.4], 0.0055)
    e = np.array([p[0] - 1.3, 2.0, 0.34])
    still("aisle_hero", e, (p[0] + 0.05, p[1], 0.42), 35, 2.0, focus=float(np.linalg.norm(e[:2] - p[:2])))
    hx, hy = p[0] - 0.02, p[1]
    hz = p[2] + 0.24  # 짐벌 헤드 높이 (몸통 기준)
    still("gimbal_macro", (hx - 0.62, hy + 0.42, hz + 0.12), (hx + 0.02, hy, hz), 70, 2.2)
    still("aisle_side", (p[0] - 1.6, 1.95, 1.25), (p[0] + 0.3, 1.2, 0.35), 35, 4.0)
    report["go2_still"] = [round(float(v), 3) for v in p]

elif MODE == "door":
    # Go2가 입구 밖에서 매장 안으로 걸어 들어온다
    for step in range(160):
        go2.set_target([0.35, 0.0, 0.0] if step > 20 else [0.0, 0.0, 0.0])
        ptz.set(-25.0, -8.0)
        app.update()
    p, yaw = pose_xy()
    timeline.pause()
    use_still_res()
    show_cloud(cloud[(cloud[:, 2] > 0.08) & (cloud[:, 1] < 5.7)][::2], 0.006)
    still("door_night", (4.55, 9.6, 0.42), (3.7, 5.2, 0.75), 35, 2.8, focus=float(np.linalg.norm(np.array([4.55, 9.6]) - p[:2])))
    show_cloud(cloud[:0])
    still("door_night_clean", (4.55, 9.6, 0.42), (3.7, 5.2, 0.75), 35, 2.8, focus=float(np.linalg.norm(np.array([4.55, 9.6]) - p[:2])))
    report["go2_still"] = [round(float(v), 3) for v in p]

elif MODE == "arm":
    q0 = np.asarray(arm.get_dof_positions().numpy() if hasattr(arm.get_dof_positions(), "numpy") else arm.get_dof_positions()).reshape(-1)
    for i in range(120):
        s = min(1.0, (i + 1) / 90)
        s = s * s * (3 - 2 * s)
        arm.set_dof_position_targets((q0 + (arm_q - q0) * s).reshape(1, -1))
        go2.set_target([0.0, 0.0, 0.0])
        ptz.set(-35.0, -12.0)
        app.update()
    timeline.pause()
    use_still_res()
    still("arm_macro", (6.78, 1.6, 1.0), (7.1, 2.07, 0.95), 50, 2.0)
    still("arm_wide", (6.2, 1.15, 1.3), (7.1, 2.0, 0.92), 35, 4.0)
    # 포인트 클라우드만 (매장 형상과 로봇 숨김)
    for pth in ("/World/Store", "/World/Go2", "/World/SO101", "/World/Task", "/World/Props", "/World/Cloud"):
        if stage.GetPrimAtPath(pth).IsValid():
            UsdGeom.Imageable(stage.GetPrimAtPath(pth)).MakeInvisible()
    UsdGeom.Imageable(cloud_prim.GetPrim()).MakeInvisible()
    # 높이별 4단계 색 (바닥 → 천장: 짙은 파랑 → 하늘색 → 흰색), 카메라 쪽 벽은 잘라 안이 보이게
    bands = [((0.2, 0.36, 0.72), -1, 0.06, 0.5), ((0.27, 0.55, 0.85), 0.06, 0.6, 1.0), ((0.45, 0.8, 0.93), 0.6, 1.35, 1.1), ((0.85, 0.95, 0.99), 1.35, 9, 1.2)]
    band_prims = []
    for i, (col, z0, z1, k) in enumerate(bands):
        bp = UsdGeom.Points.Define(stage, f"/World/CloudBands/B{i}")
        UsdShade.MaterialBindingAPI.Apply(bp.GetPrim()).Bind(emissive(f"/World/CloudBands/Looks/B{i}", col, k))
        band_prims.append((bp, z0, z1))

    def show_bands(pts, width):
        for i, (bp, z0, z1) in enumerate(band_prims):
            sel = pts[(pts[:, 2] >= z0) & (pts[:, 2] < z1)]
            if i == 0:
                sel = sel[::3]
            bp.CreatePointsAttr().Set(Vt.Vec3fArray.FromNumpy(np.ascontiguousarray(sel, np.float32)))
            bp.CreateWidthsAttr().Set(Vt.FloatArray.FromNumpy(np.full(len(sel), width, np.float32)))

    show_bands(cloud[(cloud[:, 0] < 7.85) & (cloud[:, 1] < 5.9)], 0.009)
    still("cloud_wide", (7.9, 5.9, 2.7), (3.4, 2.1, 0.2), 20, 0.0, spp=(32, 256))
    show_bands(cloud[(cloud[:, 1] < 2.9) & (cloud[:, 0] > 0.9)], 0.007)
    still("cloud_aisle", (1.0, 1.5, 1.05), (4.4, 1.25, 0.55), 26, 0.0, spp=(32, 256))

report["policy_error"] = go2.error
print("[phase10] REPORT " + json.dumps(report), flush=True)
json.dump(report, open(os.path.join(OUT, "report.json"), "w"), indent=2)
timeline.stop()
app.close()
