# SEOUL MICROFACTORY

**Making Every Store Robot-Ready.**

소상공인 매장을 Physical AI가 이해할 수 있는 공간으로 바꾸는 프로젝트의 포트폴리오 사이트입니다.
Unitree Go2 Ent-MTPTZ(짐벌 카메라 탑재형)로 매장을 스캔하고, NVIDIA Isaac Sim 디지털 트윈에서 자동화할 작업과 맞는 로봇을 고른 뒤, 도입 견적을 정리하고 SO-ARM101로 실제 작업을 검증하는 흐름을 소개합니다.

> 현재 프로젝트는 기획·개발 단계입니다. 사이트의 모든 기능 상태는 `CONCEPT`로 표시되어 있고, 실험 수치와 견적 금액은 실제 데이터가 생기기 전까지 비워 둡니다.

## 실행

Node.js 20.19 이상(권장 22)이 필요합니다.

```bash
npm install
npm run dev       # 개발 서버 http://localhost:5173
npm run build     # 타입 검사 + dist/ 빌드
npm run preview   # 빌드 결과 미리보기 http://localhost:4173
```

## 내용 수정하기

코드를 건드리지 않고 데이터 파일만 고치면 됩니다.

| 바꾸고 싶은 것 | 파일 |
|---|---|
| 섹션 문구, 모듈 설명, 워크플로 단계, 기술 스택 상태, 리포트 견적 항목 | `src/data/project.ts` |
| 로드맵 단계별 상태와 체크리스트 | `src/data/roadmap.ts` |
| SO-ARM101 실험 결과, 실험 기록 | `src/data/validation.ts` |
| 사진·영상 경로, 이미지 출처 | `src/data/media.ts` |
| 저장소 링크 등 사이트 설정 | `src/config/site.ts` |

상태값은 세 가지입니다. 실제로 돌려 보고 확인한 것만 `VERIFIED`로 바꿉니다.

- `CONCEPT`: 기획 단계
- `IN_DEVELOPMENT`: 개발 중
- `VERIFIED`: 실제 동작과 검증 완료

## 미디어 추가

`public/assets/README.md`에 넣을 파일 이름과 위치를 정리해 두었습니다. 파일을 넣고 `src/data/media.ts`에서 해당 항목의 `src`를 채우면 자리표시가 실제 사진·영상으로 바뀝니다.

모든 미디어에는 출처 구분 라벨이 붙습니다.

- `REAL PHOTO`: 실제로 촬영한 사진 (영상은 `Real footage`)
- `SIMULATION`: Isaac Sim 등에서 렌더링한 화면
- `CONCEPT VISUAL`: 이해를 돕기 위해 직접 그린 시각화
- `RECONSTRUCTION`: 실제 수집 데이터로 재구성한 결과

Go2 사진은 모두 Wikimedia Commons의 CC BY / CC BY-SA 사진이며, 출처는 `public/assets/images/go2/IMAGE_CREDITS.md`에 있습니다.

## 컨셉 시각화

HERO와 DIGITAL TWIN 섹션의 매장 장면은 실제 스캔 데이터가 아닙니다. `src/visuals/storeModel.ts`에 정의한 8m × 6m 가상 매장에서 Canvas 2D로 그린 것입니다.

- 실사풍 매장 뷰와 포인트 클라우드 뷰가 같은 형상 데이터를 쓰기 때문에 두 화면의 좌표가 일치합니다.
- 화면 밖에 있거나 탭이 숨겨지면 애니메이션을 멈춥니다.
- 모바일에서는 점 개수와 픽셀 밀도를 줄입니다.
- `prefers-reduced-motion` 설정이 켜져 있으면 정지 화면만 보여줍니다.

실제 3D 모델(`.glb`, `.ply` 등)이 생기면 DIGITAL TWIN 뷰어를 Three.js 기반으로 교체할 수 있습니다. 교체 지점은 `src/sections/DigitalTwin.tsx`의 `SceneCanvas` 두 개입니다.

## GitHub Pages 배포

`.github/workflows/deploy.yml`이 `main` 브랜치에 push될 때 자동으로 빌드하고 배포합니다.

1. GitHub에 저장소를 만들고 이 프로젝트를 push합니다.
2. 저장소 **Settings → Pages → Build and deployment → Source**를 **GitHub Actions**로 바꿉니다.
3. Actions 탭에서 배포가 끝나면 `https://<계정>.github.io/<저장소 이름>/`에서 열립니다.

배포 경로(`base`)는 워크플로가 저장소 이름으로 자동 계산해서 `VITE_BASE`로 넘깁니다. 저장소 이름을 바꿔도 설정을 고칠 필요가 없습니다. 라우터 없이 한 페이지에 해시 링크만 쓰기 때문에, 새로고침해도 404가 나지 않습니다.

로컬에서 배포 경로를 흉내 내려면 이렇게 합니다.

```bash
VITE_BASE=/seoul-microfactory/ npm run build && npx vite preview --base /seoul-microfactory/
```

## 폴더 구조

```
src/
  config/site.ts        사이트 설정, asset() 경로 도우미
  data/                 문구·상태·미디어·실험 데이터
  sections/             페이지 섹션 (Hero, Problem, Solution, Workflow, DigitalTwin, Report, RobotValidation, TechStack, Roadmap, Vision)
  components/           Navbar, Footer, MediaSlot, 상태 배지 등 공용 UI
  visuals/              가상 매장 모델, Canvas 렌더러, 평면도, 로봇 팔 도식
  hooks/                reduced motion, 현재 섹션 감지
  styles/global.css     디자인 토큰과 기본 스타일
public/assets/          이미지·영상·시뮬레이션 결과·OG 이미지
media-src/              원본 미디어 (originals/는 git 제외)
```

## Isaac Sim 시뮬레이션

`sim/` 폴더에 NVIDIA Isaac Sim 6.2 시뮬레이션 스크립트가 있습니다. 가상 매장에서 Go2가 걷고 스캔한 뒤 SO-101이 상자를 옮기는 과정을 실행하고, 데모 영상까지 만듭니다. 실행 방법, 결과, 한계는 [`sim/README.md`](sim/README.md)에 정리했습니다.

사이트의 DIGITAL TWIN 섹션에 데모 영상과 스틸 컷이, ROBOT VALIDATION 섹션에 시뮬레이션 실험 기록이 들어가 있습니다. 실제 로봇 검증 지표는 아직 비어 있습니다.

## 앞으로 연결할 지점

- **Isaac Sim 결과물**: 새로 렌더링하면 `public/assets/simulation/`의 같은 파일 이름으로 덮어쓰면 됩니다.
- **실제 Go2 스캔 데이터**: 포인트 클라우드를 웹용으로 줄인 파일(예: 간략화한 `.ply`, 또는 바이너리 배열)을 만들면, `visuals/cloud.ts`의 `getCloud()`가 그 파일을 읽도록 바꿀 수 있습니다.
- **실험 결과**: `validation.ts`의 `METRICS` 값과 `EXPERIMENT_LOG`에 측정값을 추가합니다.
- **견적**: 공급사 단가가 정해지면 `project.ts`의 `REPORT.quote`에 금액을 넣습니다. 모든 항목이 채워지면 합계가 자동으로 계산됩니다.

## 상표

Unitree, Go2는 Unitree Robotics의, NVIDIA와 Isaac Sim은 NVIDIA Corporation의 상표입니다. 이 프로젝트는 두 회사와 제휴 관계가 없습니다.
