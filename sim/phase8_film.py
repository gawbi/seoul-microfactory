"""PHASE 8: 데모 영상용 프레임 렌더링 (한 번의 시뮬레이션으로 S1~S6).

모든 동작은 PHASE 3~7에서 검증한 방식 그대로다.
  - Go2: 번들 보행 정책 + pure pursuit (물리 기반)
  - LiDAR: NVIDIA Example_Rotary (범용 모델), 포인트 클라우드는 시뮬레이션 출력 누적
  - SO-101: RobotPoser IK + 관절 드라이브, 접촉/마찰 그립 (보조 없음)
출력: sim/output/film/frames/{scene}_{idx}.jpg, gimbal/{idx}.jpg, film_log.json
"""
import json
import math
import os
import sys

from isaacsim import SimulationApp

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "output", "film")
FR = os.path.join(OUT, "frames")
GB = os.path.join(OUT, "gimbal")
for d in (FR, GB):
    os.makedirs(d, exist_ok=True)
RES = (1600, 900)
app = SimulationApp({"headless": True})
sys.path.insert(0, HERE)
from sim_common import Go2Walker, enable_extensions, physics_material, setup_physics  # noqa: E402

enable_extensions(["isaacsim.robot.policy.examples", "isaacsim.storage.native", "omni.replicator.core", "isaacsim.sensors.experimental.rtx", "isaacsim.robot.poser"])
import numpy as np  # noqa: E402
import omni.replicator.core as rep  # noqa: E402
import omni.timeline  # noqa: E402
import omni.usd  # noqa: E402
import isaacsim.core.experimental.utils.stage as stage_utils  # noqa: E402
from isaacsim.core.experimental.prims import Articulation, RigidPrim  # noqa: E402
from isaacsim.core.simulation_manager import SimulationManager  # noqa: E402
from isaacsim.robot.poser import RobotPoser, Transform  # noqa: E402
from isaacsim.sensors.experimental.rtx import Lidar, LidarSensor, parse_generic_model_output_data  # noqa: E402
from isaacsim.storage.native import get_assets_root_path  # noqa: E402
from PIL import Image  # noqa: E402
from pxr import Gf, Sdf, Usd, UsdGeom, UsdPhysics, UsdShade, Vt  # noqa: E402
from nav import PathFollower  # noqa: E402
from ptz_payload import PTZPayload  # noqa: E402
from store_scene import FIXTURES, SIM_PATH, TABLE, WORK_ZONE, _box, _material, build_store  # noqa: E402

TOP = TABLE[4]
BASE = np.array([7.15, 2.25, TOP])
OBJ = 0.03
PICK = BASE + np.array([-0.06, -0.19, 0.0])
PLACE = BASE + np.array([0.11, -0.17, 0.0])
LIDAR_MOUNT = np.array([0.28, 0.0, 0.08])
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

# ---------------- robots ----------------
go2 = Go2Walker(position=(SIM_PATH[0][0], SIM_PATH[0][1], 0.4), yaw=-math.pi / 2)
go2.spawn()
ptz = PTZPayload(stage, "/World/Go2/base")
lidar = Lidar.create("/World/Go2/base/Lidar", config="Example_Rotary", translations=[LIDAR_MOUNT.tolist()], tick_rate=10.0, accumulate_outputs=True)
lidar_sensor = LidarSensor(lidar, annotators=["generic-model-output"])

arm_prim = stage.DefinePrim("/World/SO101", "Xform")
arm_prim.GetReferences().AddReference(root + "/Isaac/Robots/RobotStudio/so101_new_calib/so101_new_calib.usd")
_xf = UsdGeom.Xformable(arm_prim)
[op for op in _xf.GetOrderedXformOps() if op.GetOpType() == UsdGeom.XformOp.TypeTranslate][0].Set(Gf.Vec3d(*BASE.tolist()))
for jp in Usd.PrimRange(arm_prim):
    if jp.IsA(UsdPhysics.FixedJoint) and not UsdPhysics.FixedJoint(jp).GetBody0Rel().GetTargets():
        UsdPhysics.FixedJoint(jp).GetLocalPos0Attr().Set(Gf.Vec3f(*BASE.tolist()))

# task objects
tray_mat = _material(stage, "/World/Task/Looks/Tray", (0.12, 0.14, 0.17), roughness=0.5)
obj_mat = _material(stage, "/World/Task/Looks/Obj", (0.85, 0.42, 0.12), roughness=0.45)
px, py = PLACE[0], PLACE[1]
_box(stage, "/World/Task/Tray/Bottom", px - 0.05, py - 0.045, TOP, px + 0.05, py + 0.045, TOP + 0.004, tray_mat)
for i, (x0, y0, x1, y1) in enumerate([(px - 0.05, py - 0.045, px + 0.05, py - 0.04), (px - 0.05, py + 0.04, px + 0.05, py + 0.045), (px - 0.05, py - 0.045, px - 0.045, py + 0.045), (px + 0.045, py - 0.045, px + 0.05, py + 0.045)]):
    _box(stage, f"/World/Task/Tray/Rim{i}", x0, y0, TOP, x1, y1, TOP + 0.016, tray_mat)
cube = UsdGeom.Cube.Define(stage, "/World/Task/Object")
cube.CreateSizeAttr(OBJ)
UsdGeom.XformCommonAPI(cube).SetTranslate(Gf.Vec3d(PICK[0], PICK[1], TOP + OBJ / 2 + 0.001))
UsdGeom.XformCommonAPI(cube).SetRotate(Gf.Vec3f(0, 0, math.degrees(math.atan2(PICK[1] - BASE[1], PICK[0] - BASE[0]) + math.pi / 2)))
UsdShade.MaterialBindingAPI.Apply(cube.GetPrim()).Bind(obj_mat)
UsdPhysics.RigidBodyAPI.Apply(cube.GetPrim())
UsdPhysics.CollisionAPI.Apply(cube.GetPrim())
UsdPhysics.MassAPI.Apply(cube.GetPrim()).CreateMassAttr(0.02)
physics_material(stage, "/World/Task/Looks/Grip", ["/World/Task/Object"], friction=1.2)


# ---------------- twin overlays (hidden until S4/S5) ----------------
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


CYAN = (0.37, 0.83, 0.94)
AMBER = (0.91, 0.7, 0.36)
UsdGeom.Xform.Define(stage, "/World/Twin")
zone_m = emissive("/World/Twin/Looks/Zone", CYAN, 0.9, 0.35)
clr_m = emissive("/World/Twin/Looks/Clear", AMBER, 0.5, 0.22)
_box(stage, "/World/Twin/TaskZone", WORK_ZONE[0], WORK_ZONE[1], 0.003, WORK_ZONE[2], WORK_ZONE[3], 0.008, zone_m, collide=False)
for name, (x0, y0, x1, y1, h) in list(FIXTURES.items()) + [("Table", TABLE)]:
    m_ = 0.22
    _box(stage, f"/World/Twin/Clear_{name}", x0 - m_, y0 - m_, 0.002, x1 + m_, y1 + m_, 0.006, clr_m, collide=False)
reach = UsdGeom.Cylinder.Define(stage, "/World/Twin/Reach")
reach.CreateRadiusAttr(0.34)
reach.CreateHeightAttr(0.004)
reach.CreateAxisAttr("Z")
UsdGeom.XformCommonAPI(reach).SetTranslate(Gf.Vec3d(BASE[0], BASE[1], TOP + 0.003))
UsdShade.MaterialBindingAPI.Apply(reach.GetPrim()).Bind(emissive("/World/Twin/Looks/Reach", (0.93, 0.97, 0.99), 0.6, 0.25))
trail_m = emissive("/World/Twin/Looks/Trail", CYAN, 2.0)
twin = UsdGeom.Imageable(stage.GetPrimAtPath("/World/Twin"))
twin.MakeInvisible()

# point cloud prims (height bands, emissive)
BANDS = [((0.16, 0.3, 0.62), -1, 0.06), ((0.22, 0.5, 0.82), 0.06, 0.6), ((0.33, 0.75, 0.9), 0.6, 1.35), ((0.75, 0.92, 0.98), 1.35, 9)]
band_prims = []
for i, (col, _, _) in enumerate(BANDS):
    pp = UsdGeom.Points.Define(stage, f"/World/Cloud/Band{i}")
    pp.CreatePointsAttr(Vt.Vec3fArray())
    pp.CreateWidthsAttr(Vt.FloatArray())
    UsdShade.MaterialBindingAPI.Apply(pp.GetPrim()).Bind(emissive(f"/World/Cloud/Looks/B{i}", col, 0.55 if i else 0.35))
    band_prims.append(pp)
VOXEL = 0.05
voxels = {}


def update_cloud(floor=False, cutaway=False):
    if not voxels:
        return 0
    allv = np.array(list(voxels.values()), dtype=np.float32)
    m = (allv[:, 0] > -0.3) & (allv[:, 0] < 8.3) & (allv[:, 1] > -0.3) & (allv[:, 1] < 6.4) & (allv[:, 2] > -0.05) & (allv[:, 2] < 2.8)
    allv = allv[m]
    if cutaway:  # 카메라 쪽 벽(앞·오른쪽)을 잘라 매장 안이 보이게 한다 (표시 방식만 바뀜)
        allv = allv[(allv[:, 0] < 7.85) & (allv[:, 1] < 5.9)]
    for bi, (pp, (_, z0, z1)) in enumerate(zip(band_prims, BANDS)):
        sel = allv[(allv[:, 2] >= z0) & (allv[:, 2] < z1)] if (floor or bi > 0) else allv[:0]
        if bi == 0:
            sel = sel[::3]  # 바닥 점은 솎아서 구조가 보이게
        pp.GetPointsAttr().Set(Vt.Vec3fArray.FromNumpy(sel))
        pp.GetWidthsAttr().Set(Vt.FloatArray.FromNumpy(np.full(len(sel), 0.012, np.float32)))
    return len(allv)


# ---------------- film camera ----------------
film_cam = UsdGeom.Camera.Define(stage, "/World/FilmCam")
film_cam.CreateFocalLengthAttr(18.0)
film_cam.CreateHorizontalApertureAttr(20.955)
film_cam.CreateVerticalApertureAttr(20.955 * RES[1] / RES[0])
film_cam.CreateClippingRangeAttr(Gf.Vec2f(0.02, 100.0))
cam_op = UsdGeom.Xformable(film_cam).AddTransformOp()


def set_cam(eye, target, focal=18.0):
    m = Gf.Matrix4d().SetLookAt(Gf.Vec3d(*map(float, eye)), Gf.Vec3d(*map(float, target)), Gf.Vec3d(0, 0, 1)).GetInverse()
    cam_op.Set(m)
    film_cam.GetFocalLengthAttr().Set(float(focal))


main_rp = rep.create.render_product("/World/FilmCam", RES)
main_ann = rep.AnnotatorRegistry.get_annotator("rgb")
main_ann.attach(main_rp)
gimbal_rp = rep.create.render_product(ptz.camera_path, (640, 360))
gimbal_ann = rep.AnnotatorRegistry.get_annotator("rgb")
gimbal_ann.attach(gimbal_rp)

dt = setup_physics(app, physics_dt=0.005, rendering_dt=0.02)
go2.attach()
omni.timeline.get_timeline_interface().play()
app.update()
art_path = [p.GetPath().pathString for p in Usd.PrimRange(arm_prim) if p.HasAPI(UsdPhysics.ArticulationRootAPI)][0]
arm = Articulation(art_path)
grip_link = RigidPrim("/World/SO101/gripper")
obj_rb = RigidPrim("/World/Task/Object")


def npv(x):
    return np.asarray(x.numpy() if hasattr(x, "numpy") else x)


def qmat(q):
    w, x, y, z = q
    return np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)], [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)], [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])


def base_pose():
    pos, quat = go2.runner.articulation.get_world_poses()
    return npv(pos).reshape(-1, 3)[0].astype(np.float64), qmat(npv(quat).reshape(-1, 4)[0].astype(np.float64))


# ---------------- arm IK (RobotPoser) ----------------
DOF = arm.dof_names
ARM, GRIP = [0, 1, 2, 3, 4], 5
q_cmd = npv(arm.get_dof_positions()).reshape(-1).copy()
poser = RobotPoser(stage, arm_prim, stage.GetPrimAtPath("/World/SO101/base"), stage.GetPrimAtPath("/World/SO101/gripper"))
seed = None


def down_R(target):
    d = target[:2] - BASE[:2]
    phi = math.atan2(d[1], d[0]) + math.pi / 2
    Rd = np.array([[0, 1, 0], [0, 0, 1], [1, 0, 0]], float)
    Rx = np.array([[1, 0, 0], [0, 0, -1], [0, 1, 0]], float)
    Rz = np.array([[math.cos(phi), -math.sin(phi), 0], [math.sin(phi), math.cos(phi), 0], [0, 0, 1]])
    return Rz @ Rx @ Rd


def solve(target):
    global seed
    R = down_R(target)
    q = Gf.Matrix3d(*R.T.flatten().tolist()).ExtractRotation().GetQuat()
    res = poser.solve_ik(Transform(t=(target - R @ TOOL_LOCAL - BASE).tolist(), q=[q.GetReal(), *q.GetImaginary()]), seed=seed, tolerance=5e-4, w_rot=0.3, w_pos=1.0, iters=400)
    seed = res.joints if res.success else seed
    vals = {k.split("/")[-1]: v for k, v in res.joints.items()}
    return bool(res.success), np.array([vals.get(n, 0.0) for n in DOF])


KEY = {}
for name, p in [("above_pick", PICK + [0, 0, 0.09]), ("grasp", PICK + [0, 0, OBJ / 2 + 0.001]), ("above_place", PLACE + [0, 0, 0.10]), ("release", PLACE + [0, 0, OBJ / 2 + 0.012])]:
    KEY[name] = solve(np.array(p))
KEY["home"] = (True, q_cmd.copy())
ik_ok = all(v[0] for v in KEY.values())
# 무대 정리: 시뮬레이션 동안 팔은 홈 자세 유지
GRIP_OPEN, GRIP_CLOSED = 0.5, -0.15

# ---------------- recording helpers ----------------
frame_log = []
counter = {"main": 0}


def capture(scene, gimbal=False, tag=""):
    img = npv(main_ann.get_data())
    if img.size:
        idx = counter["main"]
        Image.fromarray(img[:, :, :3]).save(os.path.join(FR, f"{idx:05d}.jpg"), quality=93)
        rec = {"i": idx, "scene": scene, "tag": tag}
        if gimbal:
            g = npv(gimbal_ann.get_data())
            if g.size:
                Image.fromarray(g[:, :, :3]).save(os.path.join(GB, f"{idx:05d}.jpg"), quality=90)
                rec["gimbal"] = True
        frame_log.append(rec)
        counter["main"] += 1


nav = PathFollower(SIM_PATH, speed=0.42)
last_sig = None
traj = []


def sim_step(walk=True, scan=True, t=0.0):
    """한 번의 렌더 스텝 (= 물리 4스텝). Go2 제어, 짐벌, LiDAR 누적."""
    global last_sig
    p, yaw = go2.pose()
    go2.set_target(nav.command(p[0], p[1], yaw) if walk else [0.0, 0.0, 0.0])
    ptz.set(65.0 * math.sin(t * 0.7), 12.0 * math.sin(t * 0.33) - 4.0)
    app.update()
    if walk and not nav.done:
        traj.append((float(p[0]), float(p[1])))
    if scan:
        data, _ = lidar_sensor.get_data("generic-model-output")
        if data is not None:
            gmo = parse_generic_model_output_data(data)
            n = int(gmo.numElements)
            if n > 0:
                x = np.asarray(gmo.x)[:n].astype(np.float64)
                sig = (n, float(x[:64].sum()))
                if sig != last_sig:
                    last_sig = sig
                    y = np.asarray(gmo.y)[:n].astype(np.float64)
                    z = np.asarray(gmo.z)[:n].astype(np.float64)
                    az, el = np.radians(x), np.radians(y)
                    pts = np.stack([z * np.cos(el) * np.cos(az), z * np.cos(el) * np.sin(az), z * np.sin(el)], 1)
                    pts = pts[np.isfinite(pts).all(1)]
                    bp, R = base_pose()
                    pts = (R @ (pts + LIDAR_MOUNT).T).T + bp
                    keys = np.floor(pts / VOXEL).astype(np.int64)
                    uk, ui = np.unique(keys, axis=0, return_index=True)
                    for k, q in zip(map(tuple, uk), pts[ui].astype(np.float32)):
                        if k not in voxels:
                            voxels[k] = q
    return p, yaw


def lerp(a, b, s):
    return np.asarray(a, float) + (np.asarray(b, float) - np.asarray(a, float)) * s


def ease(s):
    return 0.5 - 0.5 * math.cos(math.pi * min(1.0, max(0.0, s)))


# 안정화 (기록 안 함)
for _ in range(60):
    sim_step(walk=False, scan=False)

# ===== S1 STORE OVERVIEW (6 s @25fps, 실시간) =====
T = 0.0
for i in range(150):
    s = ease(i / 149)
    set_cam(lerp((7.6, 0.35, 2.45), (6.6, 5.35, 1.85), s), lerp((2.6, 3.4, 0.6), (3.8, 6.6, 0.35), s), 16.0)
    walk = i >= 40
    for _ in range(2):  # 25fps = 렌더 2스텝(0.04 s)마다 기록
        sim_step(walk=walk, t=T)
        T += 0.02
    capture("S1", gimbal=True)
    if i % 25 == 0:
        update_cloud()

# ===== S2 AUTONOMOUS SCANNING (3x speed: 6 render steps per frame) =====
smooth_eye = None
k = 0
while not nav.done and k < 900:
    for _ in range(6):
        p, yaw = sim_step(walk=True, t=T)
        T += 0.02
    hd = np.array([math.cos(yaw), math.sin(yaw), 0.0])
    if k < 140:  # 추적 카메라
        eye = np.array([p[0], p[1], 0]) - 2.3 * hd + np.array([0.5 * -hd[1], 0.5 * hd[0], 1.7])
        tgt = np.array([p[0], p[1], 0.25]) + 1.1 * hd
    else:  # 높은 시점에서 쌓이는 포인트 클라우드
        a = (k - 140) * 0.004
        eye = np.array([7.7 - 0.6 * a, 5.8 - 2.2 * a, 2.7])
        tgt = np.array([3.4, 2.4, 0.3])
    smooth_eye = eye if smooth_eye is None else smooth_eye + (eye - smooth_eye) * 0.25
    set_cam(smooth_eye, tgt, 16.0)
    if k % 4 == 0:
        update_cloud()
    capture("S2", gimbal=True, tag="3x")
    k += 1
n_cloud = update_cloud()
scan_done_T = T

# 궤적 곡선 (S4에서 표시)
curve = UsdGeom.BasisCurves.Define(stage, "/World/Twin/Trajectory")
pts = [Gf.Vec3f(x, y, 0.02) for x, y in traj[::3]]
curve.CreatePointsAttr(Vt.Vec3fArray(pts))
curve.CreateCurveVertexCountsAttr([len(pts)])
curve.CreateTypeAttr("linear")
curve.CreateWidthsAttr(Vt.FloatArray([0.03] * len(pts)))
curve.SetWidthsInterpolation("vertex")
UsdShade.MaterialBindingAPI.Apply(curve.GetPrim()).Bind(trail_m)

store = UsdGeom.Imageable(stage.GetPrimAtPath("/World/Store"))
robots = [UsdGeom.Imageable(stage.GetPrimAtPath(p)) for p in ("/World/Go2", "/World/SO101", "/World/Task")]
cloud = UsdGeom.Imageable(stage.GetPrimAtPath("/World/Cloud"))


def show_world(on):
    for im in [store] + robots:
        (im.MakeVisible if on else im.MakeInvisible)()


NEAR_WALLS = [UsdGeom.Imageable(stage.GetPrimAtPath(f"/World/Store/{n}")) for n in ("WallRight", "WallFrontL", "WallFrontR", "DoorHeader")]
# ===== S3 SPATIAL RECONSTRUCTION (7 s) =====
update_cloud(floor=True, cutaway=True)
show_world(False)
for i in range(175):
    s = i / 174
    ang = math.radians(150 + 60 * ease(s))  # 앞-오른쪽(입구 쪽) 위에서 내려다보며 회전
    r, h = 7.0 - 1.0 * ease(s), 6.2 - 1.6 * ease(s)
    eye = (4.0 + r * math.cos(ang - math.pi), 3.0 - r * math.sin(ang - math.pi), h)
    set_cam(eye, (4.0, 2.8, 0.4), 17.0)
    sim_step(walk=False, scan=False, t=T)
    T += 0.02
    capture("S3", tag="cloud")
    if i >= 135:  # 마지막 40프레임은 같은 시점에서 실제 매장도 렌더 (후반 크로스페이드용), 카메라 쪽 벽은 컷어웨이
        show_world(True)
        for w in NEAR_WALLS:
            w.MakeInvisible()
        app.update()
        capture("S3B", tag=f"world_{i}")
        for w in NEAR_WALLS:
            w.MakeVisible()
        show_world(False)
show_world(True)

# ===== S4 DIGITAL TWIN (6 s) =====
for _pp in band_prims:
    UsdGeom.Imageable(_pp).MakeInvisible()
twin.MakeVisible()
UsdGeom.Imageable(stage.GetPrimAtPath("/World/Twin/Reach")).MakeInvisible()
for i in range(150):
    s = ease(i / 149)
    eye = lerp((4.0, 2.0, 9.2), (4.75, 0.05, 2.75), s)
    tgt = lerp((4.0, 3.0, 0.0), (6.85, 1.85, 0.75), s)
    set_cam(eye, tgt, lerp((14.0,), (17.0,), s)[0])
    sim_step(walk=False, scan=False, t=T)
    T += 0.02
    capture("S4")

# ===== S5 ROBOT SIMULATION (4 s) =====
UsdGeom.Imageable(stage.GetPrimAtPath("/World/Twin/Reach")).MakeVisible()
for i in range(100):
    s = ease(i / 99)
    set_cam(lerp((4.75, 0.05, 2.75), (6.45, 1.0, 1.32), s), lerp((6.85, 1.85, 0.75), (7.12, 2.02, 0.9), s), lerp((17.0,), (24.0,), s)[0])
    sim_step(walk=False, scan=False, t=T)
    T += 0.02
    capture("S5")
twin.MakeInvisible()

# ===== S6 PHYSICAL VALIDATION (실시간) =====
obj_z0 = float(npv(obj_rb.get_world_poses()[0]).reshape(3)[2])
lifted_max = 0.0
cam_i = {"n": 0}


def arm_move(qa, qb, steps, grip):
    global lifted_max
    for k_ in range(steps):
        s = ease((k_ + 1) / steps)
        q_cmd[ARM] = qa[ARM] + (qb[ARM] - qa[ARM]) * s
        q_cmd[GRIP] = grip
        arm.set_dof_position_targets(q_cmd.reshape(1, -1))
        sim_step(walk=False, scan=False, t=0.0)
        lifted_max = max(lifted_max, float(npv(obj_rb.get_world_poses()[0]).reshape(3)[2]) - obj_z0)
        if k_ % 2 == 1:
            c = cam_i["n"] / 230.0
            set_cam(lerp((6.38, 1.0, 1.36), (6.55, 1.2, 1.28), min(1, c)), (7.12, 2.08, 0.97), 24.0)
            capture("S6")
            cam_i["n"] += 1


Q = {k_: v[1] for k_, v in KEY.items()}
arm_move(Q["home"], Q["above_pick"], 80, GRIP_OPEN)
arm_move(Q["above_pick"], Q["grasp"], 60, GRIP_OPEN)
arm_move(Q["grasp"], Q["grasp"], 24, GRIP_OPEN)
arm_move(Q["grasp"], Q["grasp"], 40, GRIP_CLOSED)
arm_move(Q["grasp"], Q["above_pick"], 60, GRIP_CLOSED)
arm_move(Q["above_pick"], Q["above_place"], 90, GRIP_CLOSED)
arm_move(Q["above_place"], Q["release"], 50, GRIP_CLOSED)
arm_move(Q["release"], Q["release"], 36, GRIP_OPEN)
arm_move(Q["release"], Q["above_place"], 44, GRIP_OPEN)
arm_move(Q["above_place"], Q["home"], 70, GRIP_OPEN)
arm_move(Q["home"], Q["home"], 30, GRIP_OPEN)
final = npv(obj_rb.get_world_poses()[0]).reshape(3)
xy_err = float(np.linalg.norm(final[:2] - PLACE[:2]))

report = {
    "frames": counter["main"],
    "scenes": {s: sum(1 for f in frame_log if f["scene"] == s) for s in ["S1", "S2", "S3", "S3B", "S4", "S5", "S6"]},
    "nav_completed": nav.done,
    "scan_sim_time_s": round(scan_done_T, 1),
    "cloud_points_5cm": int(n_cloud),
    "ik_all_success": ik_ok,
    "grasp_mode": "contact_friction",
    "pick_place_success": bool(xy_err < 0.04 and lifted_max > 0.03),
    "lift_max_m": round(lifted_max, 4),
    "place_xy_error_m": round(xy_err, 4),
    "go2_policy_error": go2.error,
}
print("[film] REPORT " + json.dumps(report), flush=True)
json.dump({"report": report, "frames": frame_log}, open(os.path.join(OUT, "film_log.json"), "w"))
omni.timeline.get_timeline_interface().stop()
app.close()
