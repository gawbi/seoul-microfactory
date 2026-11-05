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


class Go2Walker:
    """번들 Go2 flat-terrain 정책을 [vx, vy, yaw_rate] 명령으로 구동한다 (물리 기반 보행)."""

    def __init__(self, prim_path="/World/Go2", position=(0.0, 0.0, 0.5), yaw=0.0):
        from isaacsim.robot.policy.examples import RobotPolicyRunner, get_go2_spec

        half = yaw / 2
        spec = get_go2_spec(default_spawn_orientation=(float(np.cos(half)), 0.0, 0.0, float(np.sin(half))))
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
