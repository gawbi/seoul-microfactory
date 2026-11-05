"""Go2 평지 보행 정책을 '서서 걷는' 자세로 다시 학습한다 (Isaac Lab, rsl_rl PPO).

NVIDIA가 배포한 Go2 정책(번들/Isaac Lab 사전학습)은 보상에 자세 항목이 없어
몸통을 0.15 m까지 낮추고 고관절을 ±0.6 rad 벌린 채 걷는다 (Isaac Lab에서 직접 재현해 확인).
여기서는 공식 평지 설정(Isaac-Velocity-Flat-Unitree-Go2-v0)을 그대로 두고 자세 보상 두 개만 더한다.
  - 몸통 높이: 목표 0.33 m (base_height_l2)
  - 고관절 벌림: 기본각에서 벗어난 만큼 벌점 (joint_deviation_l1, *_hip_joint)
액추에이터(DCMotor kp 25, kd 0.5, 23.5 Nm)와 관측(48)·행동(12)은 바꾸지 않으므로
Isaac Sim 6.2 번들 env/IO 설정으로 그대로 배포할 수 있다.

실행 (Isaac Lab conda 환경):
  TERM=xterm ~/miniforge3/envs/isaaclab/bin/python sim/train_go2_upright.py --headless
출력: sim/output/policies/go2_upright/<날짜>/model_*.pt
"""
import argparse
import os
from datetime import datetime

from isaaclab.app import AppLauncher

parser = argparse.ArgumentParser()
parser.add_argument("--num_envs", type=int, default=4096)
parser.add_argument("--iters", type=int, default=600)
parser.add_argument("--target_height", type=float, default=0.33)
AppLauncher.add_app_launcher_args(parser)
args = parser.parse_args()
app = AppLauncher(args).app

import gymnasium as gym  # noqa: E402
import torch  # noqa: E402
from rsl_rl.runners import OnPolicyRunner  # noqa: E402

import isaaclab_tasks  # noqa: E402,F401
from isaaclab.managers import RewardTermCfg as RewTerm  # noqa: E402
from isaaclab.managers import SceneEntityCfg  # noqa: E402
from isaaclab.utils import configclass  # noqa: E402
from isaaclab.utils.io import dump_yaml  # noqa: E402
from isaaclab_rl.rsl_rl import RslRlVecEnvWrapper  # noqa: E402
import isaaclab.envs.mdp as mdp  # noqa: E402
from isaaclab_tasks.manager_based.locomotion.velocity.config.go2.agents.rsl_rl_ppo_cfg import UnitreeGo2FlatPPORunnerCfg  # noqa: E402
from isaaclab_tasks.manager_based.locomotion.velocity.config.go2.flat_env_cfg import UnitreeGo2FlatEnvCfg  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))


@configclass
class Go2UprightEnvCfg(UnitreeGo2FlatEnvCfg):
    def __post_init__(self):
        super().__post_init__()
        self.scene.num_envs = args.num_envs
        self.rewards.base_height = RewTerm(
            func=mdp.base_height_l2,
            weight=-30.0,
            params={"target_height": args.target_height, "asset_cfg": SceneEntityCfg("robot", body_names="base")},
        )
        self.rewards.hip_deviation = RewTerm(
            func=mdp.joint_deviation_l1,
            weight=-0.5,
            params={"asset_cfg": SceneEntityCfg("robot", joint_names=[".*_hip_joint"])},
        )


gym.register(
    id="SM-Go2-Upright-v0",
    entry_point="isaaclab.envs:ManagerBasedRLEnv",
    disable_env_checker=True,
    kwargs={"env_cfg_entry_point": Go2UprightEnvCfg},
)

env_cfg = Go2UprightEnvCfg()
agent_cfg = UnitreeGo2FlatPPORunnerCfg()
agent_cfg.max_iterations = args.iters
agent_cfg.experiment_name = "go2_upright"
log_dir = os.path.join(HERE, "output", "policies", "go2_upright", datetime.now().strftime("%Y-%m-%d_%H-%M-%S"))
env_cfg.log_dir = log_dir
env = RslRlVecEnvWrapper(gym.make("SM-Go2-Upright-v0", cfg=env_cfg), clip_actions=agent_cfg.clip_actions)
runner = OnPolicyRunner(env, agent_cfg.to_dict(), log_dir=log_dir, device=agent_cfg.device)
dump_yaml(os.path.join(log_dir, "params", "env.yaml"), env_cfg)
dump_yaml(os.path.join(log_dir, "params", "agent.yaml"), agent_cfg)
runner.learn(num_learning_iterations=agent_cfg.max_iterations, init_at_random_ep_len=True)
print("[train] done", log_dir, flush=True)
env.close()
app.close()
