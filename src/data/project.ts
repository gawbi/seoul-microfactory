import type { Status, TechStatus } from './types'

/*
 * 사이트에 들어가는 문구와 상태값은 모두 이 파일에서 관리한다.
 * 진행 상황이 바뀌면 status 값만 고치면 된다. (CONCEPT → IN_DEVELOPMENT → VERIFIED)
 */

export const NAV = [
  { id: 'problem', label: 'Problem' },
  { id: 'solution', label: 'Solution' },
  { id: 'workflow', label: 'Workflow' },
  { id: 'twin', label: 'Digital Twin' },
  { id: 'report', label: 'Report' },
  { id: 'validation', label: 'Validation' },
  { id: 'stack', label: 'Stack' },
  { id: 'roadmap', label: 'Roadmap' },
] as const

export const HERO = {
  eyebrow: ['SEOUL MICROFACTORY', 'PHYSICAL AI PLATFORM'],
  title: 'Making Every Store Robot-Ready.',
  lead: '소상공인 매장을 Physical AI가 이해하는 공간으로 전환합니다.',
  body: '사족보행 로봇이 매장을 걸으며 공간을 기록하고, 그 데이터로 만든 디지털 트윈에서 어떤 일을 로봇에게 맡길 수 있을지 먼저 시험합니다. 맞는 로봇과 도입 견적까지 정리해 드리고, 결론은 실제 로봇 팔로 확인합니다.',
  stages: ['SCANNING', 'RECONSTRUCTION', 'SIMULATION'] as const,
}

export const PROBLEMS = [
  {
    no: '01',
    title: '매장 공간을 정확히 아는 사람이 없다',
    body: '도면이 없거나, 있어도 지금 매장과 다른 경우가 대부분입니다. 통로 폭, 선반 높이, 작업대 위치를 로봇 기준으로 다시 재야 합니다.',
    marker: { x: 1.6, y: 1.25 },
  },
  {
    no: '02',
    title: '무엇을 자동화할지 고르기 어렵다',
    body: '반복되는 일은 많은데, 그중 로봇에게 맡길 만한 일을 가려낼 기준이 없습니다. 이건 공간만 봐서는 보이지 않고, 실제 작업을 지켜보고 사장님 이야기를 들어야 알 수 있습니다.',
    marker: { x: 6.55, y: 4.1 },
  },
  {
    no: '03',
    title: '들여놓기 전에는 될지 모른다',
    body: '로봇 팔이 작업대에 닿는지, 물건을 제대로 집을 수 있는지 미리 확인할 방법이 마땅치 않습니다. 결국 사 보고 나서야 압니다.',
    marker: { x: 7.05, y: 1.7 },
  },
  {
    no: '04',
    title: '사람과 비용이 먼저 든다',
    body: '전문 엔지니어 상담과 장비 비용이 시작부터 필요합니다. 작은 매장일수록 한번 시도해 보기가 어렵습니다.',
    marker: { x: 4.0, y: 5.75 },
  },
]

export type ModuleId = 'scanner' | 'reconstruction' | 'twin' | 'validation'

export interface SolutionModule {
  id: ModuleId
  index: string
  name: string
  status: Status
  summary: string
  points: string[]
  flow: { input: string; process: string; output: string }
  note?: string
}

export const MODULES: SolutionModule[] = [
  {
    id: 'scanner',
    index: 'M1',
    name: 'Go2 Store Scanner',
    status: 'CONCEPT',
    summary: 'Unitree Go2 Ent-MTPTZ가 영업이 끝난 매장을 걸어 다니며, 머리 위 짐벌 카메라를 돌려 매장 구석구석을 기록합니다.',
    points: [
      '통로를 따라 이동하며 같은 공간을 여러 시점에서 기록',
      '3축 짐벌 카메라를 좌우·상하로 돌려 선반 위아래까지 촬영',
      '열화상 센서로 냉장 쇼케이스 같은 설비 상태도 함께 확인',
      '로봇 위치를 같이 남겨 데이터를 하나의 좌표계로 정리',
    ],
    flow: { input: '매장 공간', process: '경로 주행 · 짐벌 스캔', output: '카메라 영상 · 열화상 · 공간 데이터 · 주행 궤적' },
    note: '짐벌과 열화상 사양은 판매처 공개 자료 기준이고, LiDAR 구성은 판매처마다 표기가 달라 구매 전에 확인할 예정입니다. 사이트의 Go2 사진은 짐벌이 없는 기본형입니다.',
  },
  {
    id: 'reconstruction',
    index: 'M2',
    name: '3D Reconstruction',
    status: 'CONCEPT',
    summary: '흩어진 센서 데이터를 하나의 3D 매장으로 합칩니다.',
    points: [
      '포인트 클라우드를 정합하고 노이즈를 걸러냄',
      '메시로 바꿔 바닥, 벽, 선반, 작업대 형태를 복원',
      '보기 좋은 시각화가 필요하면 Gaussian Splatting을 검토',
      '복원한 치수를 실측값과 비교해 오차를 확인',
    ],
    flow: { input: 'RGB · LiDAR · 궤적', process: 'SLAM · 정합 · 메시 변환', output: '포인트 클라우드 · 메시 · 매장 3D 모델' },
  },
  {
    id: 'twin',
    index: 'M3',
    name: 'Digital Twin & AI Analysis',
    status: 'IN_DEVELOPMENT',
    summary: '복원한 매장을 NVIDIA Isaac Sim으로 옮겨, 어디에 어떤 로봇을 둘 수 있을지 따져 봅니다.',
    points: [
      'USD 기반으로 매장과 집기를 시뮬레이션 환경에 배치',
      '통로 폭, 장애물, 작업대 높이로 로봇 작업 가능 영역 계산',
      '작업 관찰 기록과 운영자 입력을 더해 반복 업무 후보 정리',
      '후보 작업마다 맞는 로봇과 배치 위치, 도입 견적 정리',
    ],
    flow: { input: '매장 3D 모델 · 작업 관찰 · 운영자 입력', process: 'Isaac Sim 디지털 트윈 · 작업 분석', output: '자동화 후보 · 추천 로봇 · 도입 견적' },
    note: '공간 데이터만으로 매장 업무를 다 알 수는 없습니다. 어떤 일이 얼마나 자주 반복되는지는 현장 관찰과 운영자 이야기로 채웁니다.',
  },
  {
    id: 'validation',
    index: 'M4',
    name: 'Physical Validation',
    status: 'CONCEPT',
    summary: '시뮬레이션에서 고른 작업을 SO-ARM101로 직접 해 봅니다.',
    points: [
      '작업대 앞에 매니퓰레이터를 설치',
      '계산대·작업대 위 소형 물품 Pick & Place부터 시작',
      '같은 작업을 반복하며 성공 여부와 실패 원인 기록',
      '시뮬레이션 결과와 실제 결과를 나란히 비교',
    ],
    flow: { input: '자동화 시나리오 · 로봇 배치안', process: 'SO-ARM101 반복 수행', output: '성공률 · 사이클 타임 · 실패 사례' },
  },
]

export type Lane = 'REAL' | 'DIGITAL' | 'PHYSICAL'

export interface WorkflowNode {
  id: string
  label: string
  lane: Lane
  status: Status
  role: string
  inputs: string[]
  outputs: string[]
}

export const LANES: { id: Lane; label: string; caption: string }[] = [
  { id: 'REAL', label: 'Real world', caption: '현장에서 데이터를 얻는 단계' },
  { id: 'DIGITAL', label: 'Digital', caption: '가상 공간에서 분석하고 시험하는 단계' },
  { id: 'PHYSICAL', label: 'Physical', caption: '실제 로봇으로 확인하는 단계' },
]

export const WORKFLOW: WorkflowNode[] = [
  {
    id: 'real-world',
    label: 'Real World',
    lane: 'REAL',
    status: 'CONCEPT',
    role: '실제 소상공인 매장. 진열대, 계산대, 작업대, 통로가 있는 그대로의 공간입니다.',
    inputs: ['매장 공간', '운영자 인터뷰', '작업 관찰 기록'],
    outputs: ['스캔 대상 공간', '업무 정보'],
  },
  {
    id: 'go2',
    label: 'Unitree Go2 Ent-MTPTZ',
    lane: 'REAL',
    status: 'CONCEPT',
    role: '사족보행 로봇이 매장 안을 걸어 다니며 머리 위 짐벌 카메라로 주변을 훑습니다. 바퀴 로봇이 지나가기 어려운 문턱과 좁은 통로도 갈 수 있습니다.',
    inputs: ['스캔 경로', '매장 공간'],
    outputs: ['카메라 영상', 'LiDAR 스캔', '로봇 자세'],
  },
  {
    id: 'acquisition',
    label: 'Spatial Data Acquisition',
    lane: 'REAL',
    status: 'CONCEPT',
    role: '센서 데이터를 시간과 위치 기준으로 묶어 저장합니다. ROS 2 bag 형태로 기록하는 방식을 계획하고 있습니다.',
    inputs: ['카메라 영상', 'LiDAR 스캔', '로봇 자세'],
    outputs: ['동기화된 센서 로그'],
  },
  {
    id: 'reconstruction',
    label: '3D Reconstruction',
    lane: 'DIGITAL',
    status: 'CONCEPT',
    role: '센서 로그로 매장 지도를 만들고, 포인트 클라우드와 메시로 공간을 복원합니다.',
    inputs: ['동기화된 센서 로그'],
    outputs: ['포인트 클라우드', '메시', '매장 지도'],
  },
  {
    id: 'twin',
    label: 'Digital Twin · Isaac Sim',
    lane: 'DIGITAL',
    status: 'IN_DEVELOPMENT',
    role: '복원한 매장을 USD로 바꿔 Isaac Sim에 올립니다. 물리 속성과 충돌 영역을 붙여 로봇을 시험할 수 있는 공간으로 만듭니다.',
    inputs: ['메시', '매장 지도'],
    outputs: ['USD 매장 씬', '충돌 영역'],
  },
  {
    id: 'analysis',
    label: 'AI Automation Analysis',
    lane: 'DIGITAL',
    status: 'CONCEPT',
    role: '공간 정보에 작업 관찰과 운영자 입력을 더해, 로봇이 맡을 만한 반복 업무를 추립니다. 현재는 규칙 기반으로 설계 중이며, 모델 기반 판단은 이후 단계입니다.',
    inputs: ['USD 매장 씬', '업무 정보', '로봇 작업 범위'],
    outputs: ['자동화 후보 작업', '작업 위치'],
  },
  {
    id: 'deployment',
    label: 'Robot Deployment Simulation',
    lane: 'DIGITAL',
    status: 'IN_DEVELOPMENT',
    role: '후보 작업마다 로봇을 가상으로 놓아 보고, 팔이 닿는지와 동선이 겹치지 않는지 확인합니다. 통과한 조합으로 추천 로봇과 도입 견적을 정리합니다.',
    inputs: ['자동화 후보 작업', 'USD 매장 씬', '로봇 사양·단가 정보'],
    outputs: ['로봇 배치안', '작업 시나리오', '추천 로봇 · 도입 견적'],
  },
  {
    id: 'so-arm',
    label: 'SO-ARM101',
    lane: 'PHYSICAL',
    status: 'CONCEPT',
    role: '오픈소스 매니퓰레이터로 시나리오를 실제 작업대에서 수행합니다. LeRobot 기반 제어를 계획하고 있습니다.',
    inputs: ['작업 시나리오', '로봇 배치안'],
    outputs: ['실제 작업 수행 기록'],
  },
  {
    id: 'validation',
    label: 'Physical Validation',
    lane: 'PHYSICAL',
    status: 'CONCEPT',
    role: '실제 결과를 시뮬레이션과 비교합니다. 차이가 나는 지점은 다시 디지털 트윈으로 돌려보내 모델을 고칩니다.',
    inputs: ['실제 작업 수행 기록', '시뮬레이션 결과'],
    outputs: ['성공률', '사이클 타임', '실패 사례', 'Sim vs Real 비교'],
  },
]

export interface TechItem {
  name: string
  status: TechStatus
  note?: string
}

export const TECH_STACK: { category: string; items: TechItem[] }[] = [
  {
    category: 'Robotics',
    items: [
      { name: 'Unitree Go2 Ent-MTPTZ', status: 'PLANNED', note: '짐벌 카메라 탑재 스캔 플랫폼' },
      { name: 'SO-ARM101', status: 'PLANNED', note: '작업 검증용 매니퓰레이터' },
      { name: 'ROS 2', status: 'PLANNED', note: '센서 기록과 로봇 통신' },
      { name: 'LeRobot', status: 'PLANNED', note: 'SO-ARM101 제어·데이터 수집' },
    ],
  },
  {
    category: 'Spatial AI',
    items: [
      { name: 'SLAM', status: 'PLANNED' },
      { name: '3D Reconstruction', status: 'PLANNED' },
      { name: 'Point Cloud', status: 'IN_USE', note: '시뮬레이션 LiDAR 기준' },
      { name: 'Gaussian Splatting', status: 'CONSIDERING', note: '시각화 품질이 필요할 때' },
    ],
  },
  {
    category: 'Simulation',
    items: [
      { name: 'NVIDIA Isaac Sim', status: 'IN_USE', note: '6.2, 가상 매장 시뮬레이션' },
      { name: 'OpenUSD', status: 'IN_USE' },
      { name: 'Digital Twin', status: 'IN_USE', note: '가상 매장 기준' },
    ],
  },
  {
    category: 'AI',
    items: [
      { name: 'Computer Vision', status: 'PLANNED' },
      { name: 'Vision-Language Model', status: 'CONSIDERING', note: '작업 분석 보조' },
      { name: 'Task Analysis', status: 'PLANNED', note: '처음엔 규칙 기반' },
    ],
  },
  {
    category: 'Web',
    items: [
      { name: 'React', status: 'IN_USE' },
      { name: 'TypeScript', status: 'IN_USE' },
      { name: 'Vite', status: 'IN_USE' },
      { name: 'Three.js', status: 'CONSIDERING', note: '실제 3D 모델이 생기면' },
    ],
  },
]

export const VISION = {
  title: 'From Real Store to Physical AI.',
  body: '매장을 이해하고, 자동화할 수 있는 일을 찾고, 맞는 로봇과 비용을 정리한 뒤, 실제 로봇으로 확인하는 데까지. 로봇 도입을 고민하는 사장님이 처음 기대볼 수 있는 출발점을 만들고 있습니다.',
  quote: 'Every store has the potential to become robot-ready.',
}

/*
 * 매장 진단 리포트 (점주가 받게 될 결과물의 구성).
 * 금액은 실제 단가 근거가 생기기 전까지 null로 둔다. 사이트에는 "산출 전"으로 표시된다.
 */
export interface QuoteLine {
  item: string
  detail: string
  amount: number | null
}

export const REPORT = {
  status: 'CONCEPT' as Status,
  sample: '예시 매장 · 8.0 × 6.0 m',
  diagnosis: [
    { k: '공간', v: '주 통로 폭, 작업대 높이, 로봇 이동 가능 구역' },
    { k: '반복 업무', v: '작업 관찰과 운영자 인터뷰로 정리한 후보 작업' },
    { k: '자동화 후보', v: '작업대 소형 물품 Pick & Place' },
  ],
  robots: [
    { name: '소형 매니퓰레이터', fit: '작업대 위 가벼운 물품 이동', note: 'SO-ARM101로 먼저 검증하는 등급' },
    { name: '협동로봇 팔', fit: '무게나 반복 횟수가 더 큰 작업', note: '검증 결과에 따라 상향 제안' },
    { name: '자율 운반 로봇', fit: '창고와 매대 사이 물건 운반', note: '동선 분석 결과가 있을 때만 제안' },
  ],
  quote: [
    { item: '로봇 본체', detail: '추천 로봇 1대', amount: null },
    { item: '그리퍼 · 엔드이펙터', detail: '대상 물품에 맞춘 집게', amount: null },
    { item: '설치 · 작업대 보강', detail: '고정 브래킷, 안전 펜스 여부', amount: null },
    { item: '셋업 · 작업 티칭', detail: '시나리오 적용과 현장 튜닝', amount: null },
    { item: '유지보수 (연)', detail: '점검, 소모품', amount: null },
  ] as QuoteLine[],
  basis: [
    '디지털 트윈에서 작업이 가능하다고 확인된 조합만 견적에 넣습니다.',
    '금액은 로봇·부품 공급사의 실제 단가와 설치 범위를 기준으로 계산합니다.',
    '절감 시간 같은 효과 수치는 실제 검증 데이터가 쌓인 뒤에 표시합니다.',
  ],
}
