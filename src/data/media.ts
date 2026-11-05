import type { MediaKind } from './types'

/*
 * 사이트에 쓰는 모든 이미지·영상의 목록.
 * src가 null이면 화면에는 컨셉 시각화나 "준비 중" 자리표시가 나온다.
 * 실제 파일을 public/assets/ 아래에 넣고 src만 채우면 교체된다.
 */

export interface MediaItem {
  id: string
  kind: MediaKind
  type: 'image' | 'video'
  src: string | null
  /** 반응형용 작은 이미지 (width 포함) */
  srcSet?: { src: string; width: number }[]
  poster?: string
  width?: number
  height?: number
  alt: string
  caption: string
  creditId?: string
  /** 파일이 아직 없을 때 넣을 위치 안내 */
  expectedPath?: string
}

const go2 = (name: string, w: number, h: number, small: number) => ({
  src: `assets/images/go2/${name}.webp`,
  srcSet: [
    { src: `assets/images/go2/${name}-${small}.webp`, width: small },
    { src: `assets/images/go2/${name}.webp`, width: w },
  ],
  width: w,
  height: h,
})

export const MEDIA = {
  go2Hero: {
    id: 'go2Hero',
    kind: 'REAL_PHOTO',
    type: 'image',
    ...go2('go2-hero', 1600, 1430, 900),
    alt: '정면에서 본 Unitree Go2. 머리 아래쪽에 LiDAR 돔, 그 위에 카메라와 파란 LED가 보인다.',
    caption: 'Unitree Go2 기본형 (짐벌 카메라 미장착), 전시 행사장에서 촬영',
    creditId: 'go2-red-carpet',
  },
  go2Sensor: {
    id: 'go2Sensor',
    kind: 'REAL_PHOTO',
    type: 'image',
    ...go2('go2-sensor', 1200, 1048, 700),
    alt: 'Go2 머리 부분 근접 사진. 전면 카메라, LED, 아래쪽 LiDAR 돔이 보인다.',
    caption: 'Go2 기본형 머리: 전면 카메라와 4D LiDAR',
    creditId: 'go2-red-carpet',
  },
  go2Front: {
    id: 'go2Front',
    kind: 'REAL_PHOTO',
    type: 'image',
    ...go2('go2-front', 1200, 768, 700),
    alt: '실내 바닥 위를 걸어오는 Go2와 그 앞에 손을 내민 관람객',
    caption: '실내 보행 중인 Go2 (자동차 전시회)',
    creditId: 'go2-vancouver-front',
  },
  go2Side: {
    id: 'go2Side',
    kind: 'REAL_PHOTO',
    type: 'image',
    ...go2('go2-side', 1200, 914, 700),
    alt: '비스듬한 측면에서 본 Go2. 몸통과 네 다리 관절 구조가 드러난다.',
    caption: 'Go2 기본형 측면: 몸통과 다리 관절 구조',
    creditId: 'go2-vancouver-side',
  },
  go2Operation: {
    id: 'go2Operation',
    kind: 'REAL_PHOTO',
    type: 'image',
    ...go2('go2-operation', 1200, 740, 700),
    alt: '야외 보도를 걷는 Go2의 측면 모습',
    caption: '야외 보행 중인 Go2',
    creditId: 'go2-surfing',
  },

  /* 아래는 아직 파일이 없는 슬롯. Isaac Sim 작업이 끝나면 채운다. */
  simDemo: {
    id: 'simDemo',
    kind: 'SIMULATION',
    type: 'video',
    src: 'assets/simulation/seoul_microfactory_demo.mp4',
    poster: 'assets/simulation/demo_poster.webp',
    alt: 'NVIDIA Isaac Sim 6.2로 만든 SEOUL MICROFACTORY 시뮬레이션 데모. Go2가 가상 매장을 스캔하고, 포인트 클라우드와 디지털 트윈을 거쳐 SO-101이 상자를 옮긴다.',
    caption: 'Isaac Sim 6.2 시뮬레이션 데모 (약 1분)',
  },
  simStore: {
    id: 'simStore',
    kind: 'SIMULATION',
    type: 'image',
    src: 'assets/simulation/store_overview.webp',
    width: 1600,
    height: 900,
    alt: 'Isaac Sim 안에 만든 8 x 6 m 가상 매장. 벽 선반, 곤돌라, 냉장 쇼케이스, 계산대가 보인다.',
    caption: '가상 매장 8 × 6 m',
  },
  simGo2: {
    id: 'simGo2',
    kind: 'SIMULATION',
    type: 'image',
    src: 'assets/simulation/go2_scanning.webp',
    width: 1600,
    height: 900,
    alt: '짐벌 카메라를 얹은 Go2 모델이 Isaac Sim 가상 매장 통로를 걸으며 스캔하는 장면',
    caption: 'Go2 + 짐벌 카메라 (Isaac Sim)',
  },
  simCloud: {
    id: 'simCloud',
    kind: 'SIMULATION',
    type: 'image',
    src: 'assets/simulation/pointcloud.webp',
    width: 1600,
    height: 900,
    alt: '시뮬레이션 LiDAR로 모은 점들로 드러난 매장 구조',
    caption: '시뮬레이션 LiDAR 포인트 클라우드',
  },
  simTwin: {
    id: 'simTwin',
    kind: 'SIMULATION',
    type: 'image',
    src: 'assets/simulation/digital_twin.webp',
    width: 1600,
    height: 900,
    alt: '주행 궤적, 집기 주변 충돌 여유 영역, 작업 영역이 표시된 디지털 트윈',
    caption: '주행 궤적 · 충돌 여유 · 작업 영역',
  },
  simArm: {
    id: 'simArm',
    kind: 'SIMULATION',
    type: 'image',
    src: 'assets/simulation/soarm101_validation.webp',
    width: 1600,
    height: 900,
    alt: 'Isaac Sim에서 SO-101이 작업대 위 상자를 집어 트레이로 옮기는 장면',
    caption: 'SO-101 Pick & Place (Isaac Sim)',
  },
  soArmVideo: {
    id: 'soArmVideo',
    kind: 'REAL_PHOTO',
    type: 'video',
    src: null,
    alt: 'SO-ARM101이 실제 작업대에서 물체를 옮기는 영상',
    caption: 'SO-ARM101 실제 작업 영상',
    expectedPath: 'public/assets/videos/so-arm101-validation.mp4',
  },
} satisfies Record<string, MediaItem>

export interface Credit {
  id: string
  title: string
  author: string
  pageUrl: string
  license: string
  licenseUrl: string
  modified: string
}

/** public/assets/images/go2/IMAGE_CREDITS.md 와 내용이 같아야 한다. */
export const CREDITS: Credit[] = [
  {
    id: 'go2-red-carpet',
    title: 'Robotic dog stands on a red carpet',
    author: 'Nenad Stojković (Wikimedia Commons: Shixart1985)',
    pageUrl: 'https://commons.wikimedia.org/wiki/File:Robotic_dog_stands_on_a_red_carpet.jpg',
    license: 'CC BY 2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.0/',
    modified: '크롭, 크기 조정, WebP 변환. 사이트에서 흑백 필터로 표시',
  },
  {
    id: 'go2-vancouver-front',
    title: 'Vancouver Auto Show 2025 (54403754651)',
    author: 'GoToVan',
    pageUrl: 'https://commons.wikimedia.org/wiki/File:Vancouver_Auto_Show_2025_-_54403754651.jpg',
    license: 'CC BY 2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.0/',
    modified: '크롭(관람객 얼굴 제외), 크기 조정, WebP 변환',
  },
  {
    id: 'go2-vancouver-side',
    title: 'Vancouver Auto Show 2025 (54403927214)',
    author: 'GoToVan',
    pageUrl: 'https://commons.wikimedia.org/wiki/File:Vancouver_Auto_Show_2025_-_54403927214.jpg',
    license: 'CC BY 2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.0/',
    modified: '크롭(배경 인물 얼굴 제외), 크기 조정, WebP 변환',
  },
  {
    id: 'go2-surfing',
    title: 'World Dog Surfing Championship 2026 01',
    author: 'Jesse Kornblum',
    pageUrl: 'https://commons.wikimedia.org/wiki/File:World_Dog_Surfing_Championship_2026_01.jpg',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    modified: '크롭, 크기 조정, WebP 변환. 수정본도 CC BY-SA 4.0으로 배포',
  },
]
