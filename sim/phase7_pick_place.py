"""PHASE 6 + 7: 작업 테이블 위 SO-101 Pick & Place (물리 기반 관절 제어 + 접촉 그립).

- 팔: 공식 SO-101 USD, 관절 위치 드라이브에 차등 IK(DLS) 목표를 넣는다.
- 그립: 먼저 집게 접촉/마찰만으로 잡는다. 들어 올리지 못하면 FixedJoint 보조 그립으로 전환하고 report에 기록한다.
- 성공 판정: 물체가 들린 높이, 트레이 안 최종 위치.
출력: sim/output/phase7/*.png, report.json
"""
import json
import math
import os
import sys

from isaacsim import SimulationApp

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "output", "phase7")
os.makedirs(OUT, exist_ok=True)
app = SimulationApp({"headless": True})
sys.path.insert(0, HERE)
from sim_common import enable_extensions, physics_material, setup_physics  # noqa: E402

enable_extensions(["isaacsim.storage.native", "omni.replicator.core", "isaacsim.robot.poser"])
import numpy as np  # noqa: E402
import omni.replicator.core as rep  # noqa: E402
import omni.timeline  # noqa: E402
import omni.usd  # noqa: E402
import isaacsim.core.experimental.utils.stage as stage_utils  # noqa: E402
from isaacsim.core.experimental.prims import Articulation, RigidPrim  # noqa: E402
from isaacsim.core.simulation_manager import SimulationManager  # noqa: E402
from isaacsim.storage.native import get_assets_root_path  # noqa: E402
from PIL import Image  # noqa: E402
from pxr import Gf, Sdf, Usd, UsdGeom, UsdPhysics, UsdShade  # noqa: E402
from store_scene import TABLE, build_store, _box, _material  # noqa: E402

TOP = TABLE[4]
BASE = np.array([7.15, 2.25, TOP])
OBJ_SIZE = 0.03
PICK = BASE + np.array([-0.06, -0.19, 0.0])
PLACE = BASE + np.array([0.11, -0.17, 0.0])

root = get_assets_root_path()
omni.usd.get_context().new_stage()
stage = omni.usd.get_context().get_stage()
stage_utils.set_stage_up_axis("Z")
stage_utils.set_stage_units(meters_per_unit=1.0)
SimulationManager.set_backend("torch")
SimulationManager.set_physics_sim_device("cuda")
build_store(stage, root)
physics_material(stage, "/World/Store/Looks/FloorPhysics", ["/World/Store/Floor", "/World/Store/WorkTable/Top"])

# SO-101 on the table
arm_prim = stage.DefinePrim("/World/SO101", "Xform")
arm_prim.GetReferences().AddReference(root + "/Isaac/Robots/RobotStudio/so101_new_calib/so101_new_calib.usd")
# 참조 에셋이 자체 xformOp 순서를 가지고 있어 XformCommonAPI가 조용히 실패한다. 기존 translate op을 직접 쓴다.
_xf = UsdGeom.Xformable(arm_prim)
_tops = [op for op in _xf.GetOrderedXformOps() if op.GetOpType() == UsdGeom.XformOp.TypeTranslate]
(_tops[0] if _tops else _xf.AddTranslateOp()).Set(Gf.Vec3d(*BASE.tolist()))
print("[p7] arm xform ops", [op.GetOpName() for op in _xf.GetOrderedXformOps()], flush=True)
# 모델의 root_joint는 베이스를 월드에 고정한다. 월드 쪽 앵커(localPos0)를 테이블 위 설치 위치로 옮긴다.
for jp in Usd.PrimRange(arm_prim):
    if jp.IsA(UsdPhysics.FixedJoint) and not UsdPhysics.FixedJoint(jp).GetBody0Rel().GetTargets():
        UsdPhysics.FixedJoint(jp).GetLocalPos0Attr().Set(Gf.Vec3f(*BASE.tolist()))
        print("[p7] anchored", jp.GetPath(), flush=True)

# tray (static, rim) + object (dynamic)
M = "/World/Task/Looks"
tray_mat = _material(stage, f"{M}/Tray", (0.12, 0.14, 0.17), roughness=0.5)
obj_mat = _material(stage, f"{M}/Obj", (0.85, 0.42, 0.12), roughness=0.45)
px, py = PLACE[0], PLACE[1]
_box(stage, "/World/Task/Tray/Bottom", px - 0.05, py - 0.045, TOP, px + 0.05, py + 0.045, TOP + 0.004, tray_mat)
for i, (x0, y0, x1, y1) in enumerate([(px - 0.05, py - 0.045, px + 0.05, py - 0.04), (px - 0.05, py + 0.04, px + 0.05, py + 0.045), (px - 0.05, py - 0.045, px - 0.045, py + 0.045), (px + 0.045, py - 0.045, px + 0.05, py + 0.045)]):
    _box(stage, f"/World/Task/Tray/Rim{i}", x0, y0, TOP, x1, y1, TOP + 0.016, tray_mat)
obj = UsdGeom.Cube.Define(stage, "/World/Task/Object")
obj.CreateSizeAttr(OBJ_SIZE)
UsdGeom.XformCommonAPI(obj).SetTranslate(Gf.Vec3d(PICK[0], PICK[1], TOP + OBJ_SIZE / 2 + 0.001))
# 집게는 팔이 뻗는 방향으로 닫힌다. 상자 면이 집게와 평행하도록 같은 각도로 돌려 둔다.
UsdGeom.XformCommonAPI(obj).SetRotate(Gf.Vec3f(0, 0, math.degrees(math.atan2(PICK[1] - BASE[1], PICK[0] - BASE[0]) + math.pi / 2)))
UsdShade.MaterialBindingAPI.Apply(obj.GetPrim()).Bind(obj_mat)
UsdPhysics.RigidBodyAPI.Apply(obj.GetPrim())
UsdPhysics.CollisionAPI.Apply(obj.GetPrim())
UsdPhysics.MassAPI.Apply(obj.GetPrim()).CreateMassAttr(0.02)
physics_material(stage, "/World/Task/Looks/Grip", ["/World/Task/Object"], friction=1.2)

# 그리퍼 기준점(공식 gripperframe)의 그리퍼 링크 기준 위치
gf = stage.GetPrimAtPath("/World/SO101/gripper/gripperframe")
xc = UsdGeom.XformCache()
TOOL_LOCAL = np.array(xc.GetLocalToWorldTransform(stage.GetPrimAtPath("/World/SO101/gripper")).GetInverse().Transform(xc.GetLocalToWorldTransform(gf).ExtractTranslation()))
print("[p7] official gripperframe in gripper frame", TOOL_LOCAL.round(4).tolist(), flush=True)
# gripperframe은 고정 집게 안쪽 면 끝에 있다. 손가락 메시 측정(sim/probe_fingers.py) 결과,
# 두 집게 안쪽 면 사이 중심은 x=0. 상자가 고정 집게에 붙도록 x=+0.007, 손끝이 테이블 위 4 mm에 오도록 z를 잡는다.
TOOL_LOCAL = np.array([0.014, 0.0, -0.093])

cams = {
    "wide": ((6.2, 0.9, 1.45), (7.15, 2.0, 0.9)),
    "close": ((6.62, 1.3, 1.16), (7.1, 2.05, 0.88)),
}
anns = {}
for name, (pos, look) in cams.items():
    c = rep.create.camera(position=pos, look_at=look, focal_length=24.0 if name == "close" else 18.0)
    rp = rep.create.render_product(c, (1280, 720))
    a = rep.AnnotatorRegistry.get_annotator("rgb")
    a.attach(rp)
    anns[name] = a

dt = setup_physics(app, physics_dt=1 / 200, rendering_dt=1 / 50)
omni.timeline.get_timeline_interface().play()
app.update()
art_path = [p.GetPath().pathString for p in Usd.PrimRange(arm_prim) if p.HasAPI(UsdPhysics.ArticulationRootAPI)][0]
arm = Articulation(art_path)
grip_link = RigidPrim("/World/SO101/gripper")
obj_rb = RigidPrim("/World/Task/Object")
for _ in range(5):
    app.update()
for lk in ["base", "gripper"]:
    rp_ = RigidPrim(f"/World/SO101/{lk}")
    pp_, _q = rp_.get_world_poses()
    print("[p7] DEBUG", lk, "rigidprim", npv(pp_).reshape(-1).round(3).tolist(), flush=True) if False else None
_bp, _bq = arm.get_world_poses()
print("[p7] DEBUG art root pose", np.asarray(_bp.numpy() if hasattr(_bp, "numpy") else _bp).reshape(-1).round(3).tolist(), flush=True)
for lk in ["base", "gripper"]:
    _p, _q = RigidPrim(f"/World/SO101/{lk}").get_world_poses()
    print("[p7] DEBUG", lk, np.asarray(_p.numpy() if hasattr(_p, "numpy") else _p).reshape(-1).round(3).tolist(), flush=True)
rj = stage.GetPrimAtPath(art_path)
print("[p7] DEBUG root_joint", rj.GetTypeName(), UsdPhysics.Joint(rj).GetLocalPos0Attr().Get(), UsdPhysics.Joint(rj).GetBody0Rel().GetTargets(), UsdPhysics.Joint(rj).GetBody1Rel().GetTargets(), flush=True)
if os.environ.get("P7_DEBUG_ONLY"):
    app.close(); raise SystemExit
LINKS = arm.link_names
J_ROW = LINKS.index("gripper") - 1  # 고정 베이스: 루트 링크 제외
ARM = [0, 1, 2, 3, 4]
GRIP = 5
lo, hi = [np.asarray(v.numpy() if hasattr(v, "numpy") else v).reshape(-1) for v in arm.get_dof_limits()]


def npv(x):
    return np.asarray(x.numpy() if hasattr(x, "numpy") else x)


def qmat(q):
    w, x, y, z = q
    return np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)], [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)], [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])


def tool_state():
    p, q = grip_link.get_world_poses()
    p = npv(p).reshape(3)
    R = qmat(npv(q).reshape(4))
    return p + R @ TOOL_LOCAL, R, p


def obj_pos():
    p, _ = obj_rb.get_world_poses()
    return npv(p).reshape(3)


q_cmd = npv(arm.get_dof_positions()).reshape(-1).copy()
DOF = arm.dof_names
grip_open, grip_closed = float(os.environ.get("P7_OPEN", "0.5")), -0.15

# ---- 공식 IK 솔버(RobotPoser, LM)로 핵심 자세의 관절값을 푼다 ----
from isaacsim.robot.poser import RobotPoser, Transform, validate_robot_schema  # noqa: E402

print("[p7] robot schema ok:", validate_robot_schema(arm_prim), flush=True)
poser = RobotPoser(stage, arm_prim, stage.GetPrimAtPath("/World/SO101/base"), stage.GetPrimAtPath("/World/SO101/gripper"))
print("[p7] IK chain joints:", [getattr(j, "prim_path", j) for j in poser.joints], flush=True)


def down_orientation(target_world):
    """그리퍼가 아래를 향하고, 팔이 물체 쪽으로 회전한 각도에 맞춘 자세 (베이스 기준 quaternion wxyz)."""
    d = target_world[:2] - BASE[:2]
    phi = math.atan2(d[1], d[0]) + math.pi / 2  # 기본 자세는 -y 방향으로 뻗어 있다
    R_default = np.array([[0, 1, 0], [0, 0, 1], [1, 0, 0]], float)  # 열: 그리퍼 x,y,z 축 (탐색 결과)
    Rx = np.array([[1, 0, 0], [0, 0, -1], [0, 1, 0]], float)
    Rz = np.array([[math.cos(phi), -math.sin(phi), 0], [math.sin(phi), math.cos(phi), 0], [0, 0, 1]])
    R = Rz @ Rx @ R_default
    q = Gf.Matrix3d(*R.T.flatten().tolist()).ExtractRotation().GetQuat()
    return [q.GetReal(), *q.GetImaginary()], R


seed = None
solutions = {}


def solve(name, target_world):
    global seed
    quat, R = down_orientation(target_world)
    origin_target = target_world - R @ TOOL_LOCAL  # 손끝 목표 → 그리퍼 링크 원점 목표
    res = poser.solve_ik(Transform(t=(origin_target - BASE).tolist(), q=quat), seed=seed, tolerance=5e-4, w_rot=0.3, w_pos=1.0, iters=400)
    vals = {k.split("/")[-1]: v for k, v in res.joints.items()}
    q = np.array([vals.get(n, 0.0) for n in DOF])
    solutions[name] = (bool(res.success), q)
    seed = res.joints if res.success else seed
    print(f"[p7] IK {name} success={res.success} q={np.round(q, 3).tolist()}", flush=True)
    return q


above_pick = PICK + np.array([0, 0, 0.09])
grasp = PICK + np.array([0, 0, OBJ_SIZE / 2 + 0.001])
above_place = PLACE + np.array([0, 0, 0.10])
release = PLACE + np.array([0, 0, OBJ_SIZE / 2 + 0.012])
Q = {n: solve(n, p) for n, p in [("above_pick", above_pick), ("grasp", grasp), ("above_place", above_place), ("release", release)]}
Q["home"] = q_cmd.copy()


def move(qa, qb, steps, grip):
    for k in range(steps):
        u = (k + 1) / steps
        s = 0.5 - 0.5 * math.cos(math.pi * u)
        q_cmd[ARM] = qa[ARM] + (qb[ARM] - qa[ARM]) * s
        q_cmd[GRIP] = grip
        arm.set_dof_position_targets(q_cmd.reshape(1, -1))
        app.update()


def hold(steps, grip):
    for _ in range(steps):
        q_cmd[GRIP] = grip
        arm.set_dof_position_targets(q_cmd.reshape(1, -1))
        app.update()


def lerp(a, b):
    return lambda s: a + (b - a) * s


def snap(tag):
    for _ in range(2):
        app.update()
    for name, a in anns.items():
        Image.fromarray(npv(a.get_data())[:, :, :3]).save(os.path.join(OUT, f"{tag}_{name}.png"))


_g0p, _g0R = (lambda r: (npv(r[0]).reshape(3), qmat(npv(r[1]).reshape(4))))(grip_link.get_world_poses())
_j0p, _j0R = (lambda r: (npv(r[0]).reshape(3), qmat(npv(r[1]).reshape(4))))(RigidPrim("/World/SO101/moving_jaw_so101_v1").get_world_poses())
JAW0_P = _g0R.T @ (_j0p - _g0p)
JAW0_R = _g0R.T @ _j0R
print("[p7] gripper q at start", round(float(npv(arm.get_dof_positions()).reshape(-1)[GRIP]), 3), "jaw0", np.round(JAW0_P, 4).tolist(), flush=True)
log = {"ik_all_success": all(s for s, _ in solutions.values())}
move(Q["home"], Q["above_pick"], 110, grip_open)
log["tool_err_above_pick"] = round(float(np.linalg.norm(tool_state()[0] - above_pick)), 4)
_jaw = RigidPrim("/World/SO101/moving_jaw_so101_v1")


def _pose(rp):
    p_, q_ = rp.get_world_poses()
    return npv(p_).reshape(3), qmat(npv(q_).reshape(4))


def gripper_frame_report(tag):
    gp_, gR = _pose(grip_link)
    jp_, jR = _pose(_jaw)
    op_ = obj_pos()
    rel_j = gR.T @ (jp_ - gp_)
    Rrel = gR.T @ jR
    tip = rel_j + Rrel @ JAW0_R.T @ (np.array([0.017, 0.0, -0.10]) - JAW0_P)
    print(f"[p7] {tag}: obj_in_gripper={np.round(gR.T @ (op_ - gp_), 4).tolist()} jaw_tip_in_gripper={np.round(tip, 4).tolist()} gripper_x_world={np.round(gR[:, 0], 2).tolist()} gripper_z_world={np.round(gR[:, 2], 2).tolist()}", flush=True)
for _k in range(80):
    _u = (_k + 1) / 80
    _s = 0.5 - 0.5 * math.cos(math.pi * _u)
    q_cmd[ARM] = Q["above_pick"][ARM] + (Q["grasp"][ARM] - Q["above_pick"][ARM]) * _s
    q_cmd[GRIP] = grip_open
    arm.set_dof_position_targets(q_cmd.reshape(1, -1))
    app.update()
    if _k % 10 == 9:
        _tp = tool_state()[0]
        _jp = npv(_jaw.get_world_poses()[0]).reshape(3)
        _qa = npv(arm.get_dof_positions()).reshape(-1)
        print(f"[p7] descend {_k+1}: tool_z={_tp[2]-TOP:.3f} target_z={grasp[2]-TOP:.3f} jaw_origin_z={_jp[2]-TOP:.3f} q_err={np.abs(_qa[ARM]-q_cmd[ARM]).max():.3f} grip={_qa[GRIP]:.2f}", flush=True)
hold(40, grip_open)
gripper_frame_report("at_grasp")
log["tool_err_grasp"] = round(float(np.linalg.norm(tool_state()[0] - grasp)), 4)
log["tool_to_object_m"] = round(float(np.linalg.norm(tool_state()[0] - obj_pos())), 4)
snap("1_approach")
hold(60, grip_closed)  # 집게 닫기
z0 = obj_pos()[2]
move(Q["grasp"], Q["above_pick"], 80, grip_closed)
lift = obj_pos()[2] - z0
log["lift_contact_m"] = round(float(lift), 4)
assisted = False
if lift < 0.03 and log["tool_to_object_m"] < 0.015:
    # 접촉 그립 실패, 손끝은 물체에 도달함 → 보조 그립 (FixedJoint). 결과에 명시한다.
    assisted = True
    move(Q["above_pick"], Q["grasp"], 60, grip_open)
    hold(40, grip_closed)
    gp, gq = grip_link.get_world_poses()
    G = Gf.Matrix4d().SetTranslateOnly(Gf.Vec3d(*npv(gp).reshape(3).tolist()))
    w, x, y, z = npv(gq).reshape(4).tolist()
    G.SetRotateOnly(Gf.Quatd(w, x, y, z))
    O = Gf.Matrix4d().SetTranslate(Gf.Vec3d(*obj_pos().tolist()))
    rel = O * G.GetInverse()
    fj = UsdPhysics.FixedJoint.Define(stage, "/World/Task/AssistJoint")
    fj.CreateBody0Rel().SetTargets(["/World/SO101/gripper"])
    fj.CreateBody1Rel().SetTargets(["/World/Task/Object"])
    fj.CreateLocalPos0Attr().Set(Gf.Vec3f(*rel.ExtractTranslation()))
    fj.CreateLocalRot0Attr().Set(Gf.Quatf(rel.ExtractRotationQuat()))
    fj.CreateLocalPos1Attr().Set(Gf.Vec3f(0, 0, 0))
    fj.CreateLocalRot1Attr().Set(Gf.Quatf(1, 0, 0, 0))
    app.update()
    move(Q["grasp"], Q["above_pick"], 80, grip_closed)
    log["lift_assisted_m"] = round(float(obj_pos()[2] - z0), 4)
snap("2_lift")
move(Q["above_pick"], Q["above_place"], 120, grip_closed)
snap("3_transfer")
move(Q["above_place"], Q["release"], 70, grip_closed)
log["tool_err_release"] = round(float(np.linalg.norm(tool_state()[0] - release)), 4)
if assisted:
    stage.RemovePrim("/World/Task/AssistJoint")
hold(50, grip_open)
move(Q["release"], Q["above_place"], 60, grip_open)
move(Q["above_place"], Q["home"], 90, grip_open)
hold(40, grip_open)
snap("4_placed")

final = obj_pos()
xy_err = float(np.linalg.norm(final[:2] - PLACE[:2]))
in_tray = xy_err < 0.04 and abs(final[2] - (TOP + 0.004 + OBJ_SIZE / 2)) < 0.012
report = {
    "grasp_mode": "assisted_fixed_joint" if assisted else "contact_friction",
    "success": bool(in_tray),
    "final_obj_xy_error_m": round(xy_err, 4),
    "final_obj_z_m": round(float(final[2]), 4),
    "expected_z_m": round(TOP + 0.004 + OBJ_SIZE / 2, 4),
    **log,
}
print("[p7] REPORT " + json.dumps(report), flush=True)
json.dump(report, open(os.path.join(OUT, "report.json"), "w"), indent=2)
omni.timeline.get_timeline_interface().stop()
app.close()
