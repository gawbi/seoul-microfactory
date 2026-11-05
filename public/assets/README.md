# 미디어 파일 위치

실제 미디어는 이 폴더 아래에 넣고, `src/data/media.ts`에서 해당 항목의 `src`만 채우면 사이트에 반영됩니다.
`src`가 `null`인 항목은 사이트에 "pending" 자리표시로 나옵니다.

| 넣을 파일 | 내용 | media.ts 항목 | 출처 구분(kind) |
|---|---|---|---|
| `simulation/seoul_microfactory_demo.mp4` | Isaac Sim 데모 영상 (H.264, 1080p 이하, 10MB 안팎 권장) | `simDemo` | SIMULATION |
| `simulation/store_overview.png` | Isaac Sim 가상 매장 전경 | `simStore` | SIMULATION |
| `simulation/go2_scanning.png` | Isaac Sim 속 Go2 스캔 장면 | `simGo2` | SIMULATION |
| `simulation/pointcloud.png` | 시뮬레이션 LiDAR 포인트 클라우드 | (추가 예정) | SIMULATION |
| `simulation/digital_twin.png` | 디지털 트윈 작업 영역 화면 | (추가 예정) | SIMULATION |
| `simulation/soarm101_validation.png` | Isaac Sim 속 SO-ARM101 Pick & Place | (추가 예정) | SIMULATION |
| `videos/so-arm101-validation.mp4` | 실제 SO-ARM101 작업 영상 | `soArmVideo` | REAL_PHOTO (영상은 Real footage로 표시) |
| `videos/go2-store-scan.mp4` | 실제 Go2 매장 탐색 영상 | (추가 예정) | REAL_PHOTO |
| `images/store/*.webp` | 실제 매장 내부 사진 | (추가 예정) | REAL_PHOTO |
| `images/reconstruction/*.webp` | 실제 수집 데이터로 만든 3D 재구성 결과 | (추가 예정) | RECONSTRUCTION |
| `models/*.glb` | 웹에서 보여줄 3D 모델 (Three.js 도입 시) | — | RECONSTRUCTION |

## 원칙

- 시뮬레이션 화면은 반드시 `SIMULATION`, 실제 촬영물은 `REAL_PHOTO`로 표시합니다. 둘을 섞지 않습니다.
- 다른 사람이 찍은 사진은 라이선스를 확인하고 `images/go2/IMAGE_CREDITS.md` 형식으로 출처를 남깁니다.
- 이미지는 WebP로, 너비 1600px 이하로 줄여서 넣습니다. 영상에는 포스터 이미지를 함께 넣는 것을 권장합니다.
