"""Isaac Sim 6.2 공용 설정. 공식 policy 예제(isaacsim.robot.policy.examples)의 로드 순서를 따른다."""
from __future__ import annotations

import numpy as np


def enable_extensions(names):
    import omni.kit.app

    ext = omni.kit.app.get_app().get_extension_manager()
    for n in names:
        ext.set_extension_enabled_immediate(n, True)


def physics_material(stage, path, prim_paths, friction=1.0):
    from pxr import UsdPhysics, UsdShade

    mat = UsdShade.Material.Define(stage, path)
    pm = UsdPhysics.MaterialAPI.Apply(mat.GetPrim())
    pm.CreateStaticFrictionAttr().Set(friction)
    pm.CreateDynamicFrictionAttr().Set(friction)
    pm.CreateRestitutionAttr().Set(0.0)
    for p in prim_paths:
        prim = stage.GetPrimAtPath(p)
        if prim.IsValid():
            UsdShade.MaterialBindingAPI.Apply(prim).Bind(mat, UsdShade.Tokens.weakerThanDescendants, "physics")


def flat_policy_artifact():
    """Isaac Lab 공식 Go2 평지 체크포인트(export_flat_policy.py로 변환)를 번들 env/IO 설정과 묶는다.

    관측 48·행동 12·DCMotor 액추에이터가 번들 정책과 같아서 모델 파일만 바꾼다.
    (artifact, 이름)을 돌려준다. 파일이 없으면 (None, "bundled").
    """
    import os

    from isaacsim.robot.policy.examples.spec import PolicyArtifact
    from isaacsim.storage.native import get_assets_root_path

    base = os.path.join(os.path.dirname(os.path.abspath(__file__)), "output", "policies")
    # 자세 보상을 더해 다시 학습한 정책(train_go2_upright.py)이 있으면 그것을 우선 쓴다
    for name in ("go2_upright", "go2_flat_isaaclab"):
        d = os.path.join(base, name)
        model, sha = os.path.join(d, "policy.pt"), os.path.join(d, "policy.sha256")
        if os.path.exists(model) and os.path.exists(sha):
            break
    else:
        return None, "bundled"
    pdir = f"{get_assets_root_path()}/Isaac/Samples/Policies/go2"
    art = PolicyArtifact.from_files(model, f"{pdir}/physx_env.yaml", f"{pdir}/go2_physx_IO_descriptors.yaml", model_sha256=open(sha).read().strip())
    return art, name


class Go2Walker:
    """번들 Go2 flat-terrain 정책을 [vx, vy, yaw_rate] 명령으로 구동한다 (물리 기반 보행)."""

    def __init__(self, prim_path="/World/Go2", position=(0.0, 0.0, 0.5), yaw=0.0):
        from isaacsim.robot.policy.examples import RobotPolicyRunner, get_go2_spec

        half = yaw / 2
        orient = (float(np.cos(half)), 0.0, 0.0, float(np.sin(half)))
        flat, self.policy_name = flat_policy_artifact()
        # 평지 정책이 준비돼 있으면 그것을 쓴다 (번들 정책은 거친 지형용이라 몸을 낮추고 다리를 벌린 채 걷는다)
        spec = get_go2_spec(engines={"physx": flat}, default_spawn_orientation=orient) if flat else get_go2_spec(default_spawn_orientation=orient)
        self.runner = RobotPolicyRunner(spec, prim_path=prim_path, position=list(position))
        self.command = [0.0, 0.0, 0.0]
        self.ready = False
        self.error = None
        self.prim_path = prim_path

    def spawn(self):
        self.runner.spawn()
        self._disable_sleep()

    def _disable_sleep(self):
        """PhysX가 잠깐 멈춘 로봇을 재우면 GPU 텐서 명령으로 깨어나지 않는다. Isaac Lab 학습 설정처럼 끈다."""
        import omni.usd
        from pxr import PhysxSchema, Usd, UsdPhysics

        stage = omni.usd.get_context().get_stage()
        for prim in Usd.PrimRange(stage.GetPrimAtPath(self.prim_path)):
            if prim.HasAPI(UsdPhysics.ArticulationRootAPI):
                api = PhysxSchema.PhysxArticulationAPI.Apply(prim)
                api.CreateSleepThresholdAttr().Set(0.0)
                api.CreateStabilizationThresholdAttr().Set(0.0)
            if prim.HasAPI(UsdPhysics.RigidBodyAPI):
                PhysxSchema.PhysxRigidBodyAPI.Apply(prim).CreateSleepThresholdAttr().Set(0.0)

    def set_target(self, target, max_step=0.04):
        """명령을 급하게 바꾸지 않고 프레임당 max_step씩 따라가게 한다."""
        self.command[:] = [c + max(-max_step, min(max_step, g - c)) for c, g in zip(self.command, target)]

    def attach(self):
        from isaacsim.core.simulation_manager import IsaacEvents, SimulationManager

        self._cb = SimulationManager.register_callback(self._on_step, IsaacEvents.POST_PHYSICS_STEP)

    def _on_step(self, dt, _ctx):
        if self.error:
            return
        try:
            if not self.ready:
                self.runner.restart_from_default_state(self.command)
                self.ready = True
            else:
                self.runner.step(dt, self.command)
        except Exception as e:  # noqa: BLE001
            self.error = repr(e)

    def pose(self):
        pos, quat = self.runner.articulation.get_world_poses()
        p = (pos.numpy() if hasattr(pos, "numpy") else np.asarray(pos)).reshape(-1, 3)[0]
        q = (quat.numpy() if hasattr(quat, "numpy") else np.asarray(quat)).reshape(-1, 4)[0]  # wxyz
        yaw = float(np.arctan2(2 * (q[0] * q[3] + q[1] * q[2]), 1 - 2 * (q[2] ** 2 + q[3] ** 2)))
        return p.astype(float), yaw


def setup_physics(app, physics_dt=0.005, rendering_dt=0.02):
    """씬 구성이 끝난 뒤 호출. 공식 BaseSample과 같은 순서."""
    from isaacsim.core.rendering_manager import RenderingManager
    from isaacsim.core.simulation_manager import SimulationManager

    app.update()
    SimulationManager.setup_simulation(dt=physics_dt, device="cuda")
    RenderingManager.set_dt(dt=rendering_dt)
    app.update()
    return SimulationManager.get_physics_dt()
