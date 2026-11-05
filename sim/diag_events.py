"""물리 콜백이 렌더 프레임당 몇 번 불리는지 센다 (PHYSICS_PRE_STEP vs POST_PHYSICS_STEP)."""
import os, sys
from isaacsim import SimulationApp
app = SimulationApp({"headless": True})
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sim_common import Go2Walker, enable_extensions, physics_material, setup_physics  # noqa: E402
enable_extensions(["isaacsim.robot.policy.examples", "isaacsim.storage.native"])
import omni.timeline, omni.usd  # noqa: E402
import isaacsim.core.experimental.utils.stage as stage_utils  # noqa: E402
from isaacsim.core.simulation_manager import IsaacEvents, SimulationEvent, SimulationManager  # noqa: E402
from isaacsim.storage.native import get_assets_root_path  # noqa: E402
root = get_assets_root_path()
omni.usd.get_context().new_stage(); stage = omni.usd.get_context().get_stage()
stage_utils.set_stage_up_axis("Z"); stage_utils.set_stage_units(meters_per_unit=1.0)
SimulationManager.set_backend("torch"); SimulationManager.set_physics_sim_device("cuda")
stage_utils.add_reference_to_stage(usd_path=root + "/Isaac/Environments/Grid/default_environment.usd", path="/World/ground")
go2 = Go2Walker(position=(0.0, 0.0, 0.5)); go2.spawn()
setup_physics(app); go2.attach()
cnt = {"pre": 0, "post": 0}
SimulationManager.register_callback(lambda dt, c=None: cnt.__setitem__("pre", cnt["pre"] + 1), event=SimulationEvent.PHYSICS_PRE_STEP)
SimulationManager.register_callback(lambda dt, c=None: cnt.__setitem__("post", cnt["post"] + 1), event=IsaacEvents.POST_PHYSICS_STEP)
omni.timeline.get_timeline_interface().play()
for _ in range(20): app.update()
cnt.update(pre=0, post=0)
for _ in range(50): app.update()
act = go2.runner._actuators
print("[ev]", cnt, "per update:", cnt["pre"] / 50, cnt["post"] / 50, "actuator cb:", getattr(act, "_actuator_callback_id", None), "auto:", getattr(act, "_auto_step_pre_physics", None))
app.close()
