import type { Status, TechStatus } from './types'

/*
 * 사이트 문구와 진행 상태는 모두 이 파일에서 관리한다.
 * 상태가 바뀌면 status만 고친다. (CONCEPT → IN_DEVELOPMENT → VERIFIED)
 */

export const NAV = [
  { id: 'process', label: '과정' },
  { id: 'film', label: '데모' },
  { id: 'report', label: '진단서' },
  { id: 'evidence', label: '검증' },
  { id: 'roadmap', label: '로드맵' },
] as const

export const HERO = {
  lines: ['SEOUL', 'MICROFACTORY'],
  lead: '문 닫은 매장을 로봇이 걸으며 잽니다.',
  body: '그 데이터로 가상 매장을 만들고, 어떤 일을 로봇에게 맡길 수 있는지, 비용은 얼마인지 먼저 따져 봅니다.',
  credit: 'NVIDIA Isaac Sim 6.2 패스 트레이싱 렌더. Isaac Lab에서 직접 학습시킨 보행 정책으로 가상 매장을 걷는 장면입니다.',
}

export const INTRO = {
  statement: ['로봇은 준비됐습니다.', '동네 가게가 아직입니다.'],
  paragraphs: [
    '작은 매장에는 도면이 없습니다. 있어도 지금 모습과 다릅니다. 통로 폭과 선반 높이, 작업대 위치를 로봇 기준으로 다시 재야 합니다.',
    '무엇을 맡길지 고르기도 어렵습니다. 반복되는 일은 많은데 그중 로봇이 해낼 일을 가려낼 기준이 없고, 엔지니어 상담부터 비용이 듭니다. 그래서 대부분 사 보고 나서야 압니다.',
    '저희는 그 순서를 바꾸려고 합니다. 먼저 재고, 가상으로 해 보고, 된다는 것만 들여놓습니다.',
  ],
}

export interface Step {
  id: string
  title: string
  body: string
  status: Status
  statusNote: string
  media: 'gimbal' | 'cloud' | 'arm' | null
}

export const STEPS: Step[] = [
  {
    id: 'scan',
    title: '매장을 걷습니다',
    body: 'Unitree Go2 Ent-MTPTZ가 영업이 끝난 매장 통로를 걸으며, 등에 얹은 짐벌 카메라를 돌려 선반 위아래까지 찍습니다. 바퀴로는 못 넘는 문턱도 넘습니다.',
    status: 'IN_DEVELOPMENT',
    statusNote: '가상 매장에서 주행 완료. 실제 로봇은 도입 전',
    media: 'gimbal',
  },
  {
    id: 'reconstruct',
    title: '공간을 점으로 옮깁니다',
    body: 'LiDAR가 쏜 빛이 돌아온 자리를 로봇 위치에 맞춰 쌓으면 매장 구조가 드러납니다. 가상 매장 한 바퀴에 5 cm 간격으로 약 20만 개 점이 모였습니다.',
    status: 'IN_DEVELOPMENT',
    statusNote: '시뮬레이션 LiDAR로 확인. 실제 매장 스캔은 전',
    media: 'cloud',
  },
  {
    id: 'twin',
    title: '가상 매장에서 먼저 해 봅니다',
    body: '복원한 매장을 Isaac Sim에 올려, 로봇 팔이 작업대에 닿는지, 물건을 집어 옮길 수 있는지 시험합니다. 통과한 조합만 추천과 견적에 들어갑니다.',
    status: 'IN_DEVELOPMENT',
    statusNote: 'Pick & Place 시뮬레이션 3회 성공',
    media: 'arm',
  },
  {
    id: 'validate',
    title: '실제 로봇 팔로 확인합니다',
    body: '시뮬레이션에서 고른 작업을 SO-ARM101로 직접 반복합니다. 결과가 다르게 나온 지점은 다시 가상 매장을 고치는 데 씁니다.',
    status: 'CONCEPT',
    statusNote: '실물 검증 전',
    media: null,
  },
]

export const FILM = {
  title: '스캔부터 Pick & Place까지, 한 번에 돌렸습니다.',
  facts: [
    { k: '보행', v: 'Isaac Lab에서 직접 학습시킨 강화학습 정책으로 걷습니다. 미리 만든 애니메이션이 아니라 물리 시뮬레이션입니다.' },
    { k: 'LiDAR', v: '407번 스캔해 5 cm 간격 196,503개 점을 모았습니다.' },
    { k: '로봇 팔', v: '집게 접촉과 마찰만으로 잡았습니다. 세 번 해서 세 번 성공했고, 놓은 위치 오차는 1.4~2.2 mm였습니다.' },
    { k: '한계', v: '매장은 실측이 아닌 가정 배치이고, 짐벌과 LiDAR는 단순화한 모델입니다. 스캔 구간은 3배속입니다.' },
  ],
}

export const NIGHT = {
  title: '손님이 없는 시간에 걷습니다.',
  body: '스캔은 문을 닫은 뒤에 합니다. 영업을 멈출 필요도, 손님 동선을 피해 다닐 필요도 없습니다.',
}

export interface TechItem {
  name: string
  status: TechStatus
  note?: string
}

export const TECH_STACK: { category: string; items: TechItem[] }[] = [
  {
    category: '로봇',
    items: [
      { name: 'Unitree Go2 Ent-MTPTZ', status: 'PLANNED' },
      { name: 'SO-ARM101', status: 'PLANNED' },
      { name: 'ROS 2', status: 'PLANNED' },
      { name: 'LeRobot', status: 'PLANNED' },
    ],
  },
  {
    category: '공간',
    items: [
      { name: 'Point Cloud', status: 'IN_USE', note: '시뮬레이션 LiDAR' },
      { name: 'SLAM', status: 'PLANNED' },
      { name: '3D Reconstruction', status: 'PLANNED' },
      { name: 'Gaussian Splatting', status: 'CONSIDERING' },
    ],
  },
  {
    category: '시뮬레이션',
    items: [
      { name: 'NVIDIA Isaac Sim 6.2', status: 'IN_USE' },
      { name: 'Isaac Lab (강화학습)', status: 'IN_USE' },
      { name: 'OpenUSD', status: 'IN_USE' },
      { name: 'RTX 패스 트레이싱', status: 'IN_USE' },
    ],
  },
  {
    category: '분석',
    items: [
      { name: '규칙 기반 작업 선정', status: 'PLANNED' },
      { name: 'Vision-Language Model', status: 'CONSIDERING' },
    ],
  },
  {
    category: '웹',
    items: [
      { name: 'React', status: 'IN_USE' },
      { name: 'TypeScript', status: 'IN_USE' },
      { name: 'Vite', status: 'IN_USE' },
    ],
  },
]

/*
 * 매장 진단서 (점주가 받게 될 결과물의 구성).
 * 금액은 실제 단가 근거가 생기기 전까지 null로 둔다. 화면에는 "산출 전"으로 나온다.
 */
export interface QuoteLine {
  item: string
  detail: string
  amount: number | null
}

export const REPORT = {
  status: 'CONCEPT' as Status,
  title: '점주님이 받는 건 진단서 한 장입니다.',
  body: '매장을 재고 가상으로 시험한 결과를 한 장에 정리합니다. 어떤 일을 맡길 수 있는지, 어떤 로봇이 맞는지, 들여놓는 데 얼마가 드는지까지 적습니다.',
  sample: '예시 매장 8.0 × 6.0 m',
  diagnosis: [
    { k: '공간', v: '주 통로 폭, 작업대 높이, 로봇이 다닐 수 있는 구역' },
    { k: '반복 업무', v: '작업 관찰과 점주 인터뷰로 고른 후보' },
    { k: '자동화 후보', v: '작업대 소형 물품 옮기기' },
  ],
  robots: [
    { name: '소형 로봇 팔', fit: '작업대 위 가벼운 물품 이동' },
    { name: '협동로봇 팔', fit: '더 무겁거나 자주 반복되는 작업' },
    { name: '자율 운반 로봇', fit: '창고와 매대 사이 운반' },
  ],
  quote: [
    { item: '로봇 본체', detail: '추천 로봇 1대', amount: null },
    { item: '그리퍼', detail: '대상 물품에 맞춘 집게', amount: null },
    { item: '설치', detail: '고정 브래킷, 작업대 보강', amount: null },
    { item: '셋업과 티칭', detail: '현장 튜닝 포함', amount: null },
    { item: '유지보수', detail: '연간 점검, 소모품', amount: null },
  ] as QuoteLine[],
  basis: [
    '가상 매장에서 된다고 확인한 조합만 견적에 넣습니다.',
    '금액은 공급사 실제 단가와 설치 범위로 계산합니다.',
    '절감 시간 같은 효과는 실제 검증 데이터가 쌓인 뒤에 적습니다.',
  ],
}

export const CLOSING = {
  title: '모든 가게가 로봇을 들일 수 있을 때까지.',
  body: '로봇 도입을 고민하는 사장님이 처음 기대 볼 수 있는 곳을 만들고 있습니다.',
}
