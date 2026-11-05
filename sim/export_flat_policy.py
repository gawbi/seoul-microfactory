"""Isaac Lab 공식 Go2 평지 보행 체크포인트를 받아 TorchScript로 바꾼다.

번들 Go2 정책(isaacsim.robot.policy.examples)은 계단 등 거친 지형 설정으로 학습돼 몸을 낮추고
다리를 옆으로 벌린 채 걷는다. 평지 매장에는 Isaac Lab의 Isaac-Velocity-Flat-Unitree-Go2-v0
사전학습 체크포인트가 맞다. 관측(48)·행동(12)·액추에이터 설정이 번들 정책과 같아서
모델 파일만 바꿔 같은 RobotPolicyRunner로 돌린다.

  ~/isaacsim62_env/bin/python -I sim/export_flat_policy.py                       # 공식 체크포인트
  ~/isaacsim62_env/bin/python -I sim/export_flat_policy.py <model_N.pt> go2_upright  # train_go2_upright.py 결과
출력: sim/output/policies/<이름>/policy.pt, policy.sha256
"""
import hashlib
import os
import urllib.request

import sys

import torch

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = sys.argv[1] if len(sys.argv) > 1 else None
OUT = os.path.join(HERE, "output", "policies", sys.argv[2] if len(sys.argv) > 2 else "go2_flat_isaaclab")
URL = "https://omniverse-content-production.s3-us-west-2.amazonaws.com/Assets/Isaac/5.1/Isaac/IsaacLab/PretrainedCheckpoints/rsl_rl/Isaac-Velocity-Flat-Unitree-Go2-v0/checkpoint.pt"
os.makedirs(OUT, exist_ok=True)
ckpt = SRC or os.path.join(OUT, "checkpoint.pt")
if not os.path.exists(ckpt):
    urllib.request.urlretrieve(URL, ckpt)

sd = torch.load(ckpt, map_location="cpu", weights_only=True)["model_state_dict"]
actor = torch.nn.Sequential(
    torch.nn.Linear(48, 128), torch.nn.ELU(),
    torch.nn.Linear(128, 128), torch.nn.ELU(),
    torch.nn.Linear(128, 128), torch.nn.ELU(),
    torch.nn.Linear(128, 12),
)
actor.load_state_dict({k[len("actor."):]: v for k, v in sd.items() if k.startswith("actor.")})
actor.eval()
scripted = torch.jit.script(actor)
path = os.path.join(OUT, "policy.pt")
scripted.save(path)
digest = hashlib.sha256(open(path, "rb").read()).hexdigest()
open(os.path.join(OUT, "policy.sha256"), "w").write(digest)
with torch.no_grad():
    print("export ok", path, digest[:16], scripted(torch.zeros(1, 48)).numpy().round(3).tolist())
