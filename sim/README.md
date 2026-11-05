# Isaac Sim 시뮬레이션 (PHASE 1~9)

NVIDIA Isaac Sim 6.2로 만든 SEOUL MICROFACTORY 데모입니다.
가상 매장 안에서 Go2가 걸으며 스캔하고, 포인트 클라우드와 디지털 트윈을 거쳐, SO-101이 작업대의 상자를 옮기는 과정까지 한 번의 시뮬레이션으로 실행합니다.

> 모든 장면은 가상 매장 시뮬레이션입니다. 실제 매장을 스캔하거나 실제 로봇을 촬영한 결과가 아닙니다.

## 환경

| 항목 | 값 |
|---|---|
| Isaac Sim | 6.2.0 (pip, `~/isaacsim62_env`, Python 3.12) |
| GPU | RTX 5070 Ti Laptop 12 GB, 드라이버 595.99 |
| RAM | 14 GB + swap 32 GB. 최대 사용량 약 11 GB |
| 로봇 에셋 | NVIDIA 공식 `Isaac/IsaacLab/Robots/Unitree/Go2/go2.usd`, `Isaac/Robots/RobotStudio/so101_new_calib/so101_new_calib.usd` |
| 상품 | NVIDIA YCB 스캔 모델 (`Isaac/Props/YCB/Axis_Aligned`) |

기존 Isaac Sim 5.1 환경(`~/isaacsim_env`, Isaac Lab 2.3)은 그대로 두었습니다.

## 실행

```bash
PY=~/isaacsim62_env/bin/python
$PY sim/phase1_smoke.py        # 실행 확인, 공식 Go2/SO-101 로드
$PY sim/phase2_store.py        # 가상 매장 + Go2(짐벌) 정지 화면
$PY sim/phase3_navigate.py     # Go2 경로 주행 (보행 정책)
$PY sim/phase4_sensors.py      # 짐벌 카메라 + RTX LiDAR → 포인트 클라우드 (cloud.ply)
$PY sim/phase7_pick_place.py   # SO-101 Pick & Place
$PY sim/phase8_film.py         # 영상 프레임 S1~S6
$PY sim/phase8_s3.py           # S3(재구성) 장면 재렌더 (phase4 클라우드 사용)

# 후반 작업 (오버레이는 Chrome + puppeteer-core 필요)
F=sim/output/film
python3 -I sim/post/make_spec.py $F/film_log.json $F/overlay_spec.json
node sim/post/render_overlays.mjs $F/overlay_spec.json $F/overlays sim/post   # puppeteer-core 설치 위치에서 실행
python3 -I sim/post/compose.py $F $F/overlays $F/seoul_microfactory_demo.mp4
```

결과물은 `sim/output/`에 쌓이고 git에서는 제외됩니다. 사이트에 쓰는 최종본만 `public/assets/simulation/`에 복사합니다.

## 파일

| 파일 | 역할 |
|---|---|
| `store_scene.py` | 8 × 6 m 가상 매장. 웹사이트 컨셉 시각화(`src/visuals/storeModel.ts`)와 같은 배치 |
| `ptz_payload.py` | 3축 짐벌 카메라 단순화 모델 (yaw ±270°, pitch −90°~+25°로 제한) |
| `sim_common.py` | 공식 policy 예제와 같은 로드 순서, Go2 보행 래퍼 |
| `nav.py` | pure pursuit 경로 추종 (모서리 스무딩, 회전 속도 제한) |
| `phase*.py` | 단계별 실행 스크립트 |
| `probe_*.py`, `diag_*.py` | 에셋 구조 탐색, 문제 진단 |
| `post/` | 오버레이 HTML, 합성 스크립트 |

## 결과

| 단계 | 결과 | 근거 |
|---|---|---|
| Go2 보행 | Isaac Sim 번들 강화학습 보행 정책으로 물리 기반 주행. 매장 경로 완주 | `phase3` 리포트, 집기와 최소 거리 0.37 m(로봇 중심) |
| 짐벌 카메라 | 몸통 위 단순화 모델. 스캔 중 좌우·상하 회전 | `phase4/gimbal_*.png` |
| LiDAR | NVIDIA 범용 회전형 모델(Example_Rotary). 466회 스캔, 5 cm 복셀 172,392점 | `phase4/report.json`, `cloud.ply` |
| SO-101 | RobotPoser(LM) IK + 관절 드라이브. **집게 접촉·마찰만으로** 잡음, 2회 모두 성공 | 들어 올림 7.3 / 8.3 cm, 놓기 오차 1.4 / 2.2 mm |
| 영상 | 55.7초, 1600×900 원본 / 1280×720 웹용(12.7 MB) | `public/assets/simulation/seoul_microfactory_demo.mp4` |

## 한계와 사실 관계

- **매장**: 실측이 아닌 가정 배치입니다. 실제 매장 스캔 데이터로 바꾸는 작업은 로드맵 PHASE 02~03에 남아 있습니다.
- **Go2 Ent-MTPTZ**: Isaac Sim에는 짐벌 탑재형 모델이 없어, 공식 Go2 모델 위에 단순화한 짐벌을 얹었습니다. 실제 짐벌 형상과 다릅니다.
- **LiDAR**: Go2 Ent-MTPTZ의 실제 LiDAR 구성은 판매처마다 표기가 달라 확인되지 않았습니다. 시뮬레이션에는 범용 회전형 모델을 썼습니다.
- **보행**: 번들 정책은 평지 학습 모델입니다. 1 cm 문턱에도 걸려서 매장 바닥 충돌면을 하나로 이었고, 1 rad/s 급회전 직후 로봇 물리 상태가 멈추는 현상이 있어 경로 모서리를 둥글게 하고 회전 속도를 0.55 rad/s로 제한했습니다 (`diag_turn.py`, `diag_freeze.py`).
- **짐벌 움직임**: 사양 범위 안에서 스크립트로 각도를 지정합니다. 물체 추적 같은 지능형 제어는 아닙니다.
- **SO-101 잡기 기준점**: 공식 `gripperframe`은 고정 집게 안쪽 면 끝에 있어, 손가락 메시를 측정해 두 집게 사이 기준점(그리퍼 좌표 x = +0.014, z = −0.093)을 따로 정했습니다 (`probe_fingers.py`).
- **영상 연출**: 스캔 구간은 3배속입니다. 포인트 클라우드 장면(S3)은 PHASE 4에서 저장한 같은 경로의 시뮬레이션 클라우드로 다시 렌더링했습니다. 재구성 장면은 카메라 쪽 벽 점을 잘라 보여 줍니다(표시 방식만 바뀜).
