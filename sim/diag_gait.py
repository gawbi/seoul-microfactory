"""Go2 보행 자세 진단: 학습 설정(env yaml)과 실제 적용된 관절 게인·자세를 비교한다.

출력: 기본 관절각, 강성/감쇠(설정 vs 실제), 서 있을 때와 걸을 때 몸통 높이, 관절각 평균.
"""
import json
import os
import sys

from isaacsim import SimulationApp

app = SimulationApp({"headless": True})
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sim_common import Go2Walker, enable_extensions, physics_material, setup_physics  # noqa: E402

ENGINE = sys.argv[1] if len(sys.argv) > 1 else "physx"
enable_extensions(["isaacsim.robot.policy.examples", "isaacsim.storage.native"] + (["isaacsim.physics.newton"] if ENGINE == "newton" else []))
import numpy as np  # noqa: E402
import omni.timeline  # noqa: E402
import omni.usd  # noqa: E402
import isaacsim.core.experimental.utils.stage as stage_utils  # noqa: E402
from isaacsim.core.simulation_manager import SimulationManager  # noqa: E402
from isaacsim.storage.native import get_assets_root_path  # noqa: E402

root = get_assets_root_path()
omni.usd.get_context().new_stage()
stage = omni.usd.get_context().get_stage()
stage_utils.set_stage_up_axis("Z")
stage_utils.set_stage_units(meters_per_unit=1.0)
SimulationManager.set_backend("torch")
SimulationManager.set_physics_sim_device("cuda")
if ENGINE != "physx":
    print("[diag] switch", SimulationManager.switch_physics_engine(ENGINE, verbose=True), SimulationManager.get_available_physics_engines())
stage_utils.add_reference_to_stage(usd_path=root + "/Isaac/Environments/Grid/default_environment.usd", path="/World/ground")
physics_material(stage, "/World/ground/Looks/PhysicsMaterial", ["/World/ground/GroundPlane/CollisionPlane"])
go2 = Go2Walker(position=(0.0, 0.0, 0.5))
go2.spawn()
setup_physics(app)
go2.attach()
omni.timeline.get_timeline_interface().play()
app.update()

r = go2.runner
ec = r.env_config
out = {"policy": go2.policy_name, "engine": ENGINE, "active": SimulationManager.get_active_physics_engine(), "runner_engine": r.engine, "timing": {"physics_dt": ec.timing.physics_dt, "decimation": ec.timing.decimation}, "sim_dt": SimulationManager.get_physics_dt()}
jp = getattr(ec, "joint_properties", None) or getattr(ec, "joints", None)
out["env_fields"] = [k for k in dir(ec) if not k.startswith("_")]


def npv(x):
    return np.asarray(x.numpy() if hasattr(x, "numpy") else x)


TG = []


def held():
    h = r._held_target
    j = getattr(h, "joints", None)
    if j is None:
        return None
    for name in ("positions", "position", "joint_positions"):
        v = getattr(j, name, None)
        if v is not None:
            try:
                return npv(v.numpy() if hasattr(v, "numpy") else v).reshape(-1)
            except Exception:  # noqa: BLE001
                pass
    da = getattr(j, "data_array", None) or getattr(j, "_data_array", None)
    if da is not None:
        return npv(da.numpy())[0].reshape(-1)
    return None


def sample(n, cmd):
    zs, qs, ts = [], [], []
    for _ in range(n):
        go2.command[:] = cmd
        app.update()
        p, _ = go2.pose()
        zs.append(p[2])
        qs.append(npv(r.articulation.get_dof_positions()).reshape(-1))
        t = held()
        if t is not None:
            ts.append(t)
    TG.append(np.mean(ts[-50:], 0).round(3).tolist() if ts else repr(r._held_target)[:600])
    return float(np.mean(zs[-50:])), np.mean(qs[-50:], 0).round(3).tolist()


out["stand_z"], out["stand_q"] = sample(150, [0.0, 0.0, 0.0])
out["walk_z"], out["walk_q"] = sample(200, [0.5, 0.0, 0.0])
art = r.articulation
out["dof_names"] = list(art.dof_names)
try:
    k, d = art.get_dof_gains()
    out["gains_actual"] = {"stiffness": npv(k).reshape(-1).round(2).tolist(), "damping": npv(d).reshape(-1).round(3).tolist()}
except Exception as e:  # noqa: BLE001
    out["gains_actual"] = repr(e)
try:
    out["default_q"] = npv(art.get_default_state()[3] if isinstance(art.get_default_state(), tuple) else art.get_default_state()).reshape(-1).round(3).tolist()
except Exception as e:  # noqa: BLE001
    out["default_q"] = repr(e)
for name in ("joints", "joint_properties", "robot_joints", "actuators"):
    v = getattr(ec, name, None)
    if v is not None:
        out[f"ec_{name}"] = repr(v)[:1500]
out["targets_stand_walk"] = TG
from pxr import Usd, UsdPhysics, PhysxSchema
jinfo = {}
mass = 0.0
for prim in Usd.PrimRange(stage.GetPrimAtPath("/World/Go2")):
    if prim.HasAPI(UsdPhysics.MassAPI):
        m = UsdPhysics.MassAPI(prim).GetMassAttr().Get()
        mass += m or 0.0
    n = prim.GetName()
    if n in ("FL_hip_joint", "FL_calf_joint", "RL_thigh_joint"):
        d = {}
        for a in prim.GetAttributes():
            an = a.GetName()
            if any(k in an for k in ("drive", "Friction", "friction", "armature", "Armature", "maxJointVelocity", "limit", "Force", "damping", "stiffness")):
                d[an] = str(a.Get())
        d["apis"] = [str(x) for x in prim.GetAppliedSchemas()]
        jinfo[n] = d
out["usd_mass_sum"] = mass
out["joint_usd"] = jinfo
for fn in ("get_dof_armatures", "get_dof_friction_properties", "get_dof_max_efforts", "get_dof_max_velocities", "get_dof_limits"):
    try:
        v = getattr(r.articulation, fn)()
        out[fn] = [npv(x).reshape(-1).round(3).tolist() for x in v] if isinstance(v, tuple) else npv(v).reshape(-1).round(3).tolist()
    except Exception as e:  # noqa: BLE001
        out[fn] = repr(e)[:200]
try:
    m = r.articulation.get_masses() if hasattr(r.articulation, "get_masses") else None
    out["mass_total"] = float(npv(m).sum()) if m is not None else None
except Exception as e:  # noqa: BLE001
    out["mass_total"] = repr(e)
try:
    from pxr import UsdPhysics
    sc = [p for p in stage.Traverse() if p.IsA(UsdPhysics.Scene)]
    out["gravity"] = [(str(p.GetPath()), UsdPhysics.Scene(p).GetGravityMagnitudeAttr().Get(), str(UsdPhysics.Scene(p).GetGravityDirectionAttr().Get())) for p in sc]
except Exception as e:  # noqa: BLE001
    out["gravity"] = repr(e)
out["error"] = go2.error
print("[diag] " + json.dumps(out, default=str))
app.close()
