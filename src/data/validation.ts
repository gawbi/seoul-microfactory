/*
 * SO-ARM101 실제 검증 결과.
 * 실험을 하기 전까지 value는 null로 둔다. 사이트에는 "Not yet measured"로 표시된다.
 * 숫자를 넣을 때는 measuredAt과 trials도 같이 채운다.
 */

export interface Metric {
  id: string
  label: string
  unit: string
  value: number | null
  method: string
  measuredAt?: string
  trials?: number
}

export const METRICS: Metric[] = [
  {
    id: 'success-rate',
    label: 'Task success rate',
    unit: '%',
    value: null,
    method: '같은 Pick & Place를 정해진 횟수만큼 반복해 성공 비율을 기록',
  },
  {
    id: 'cycle-time',
    label: 'Average cycle time',
    unit: 's',
    value: null,
    method: '집기 시작부터 내려놓기 완료까지의 시간 평균',
  },
  {
    id: 'failure-cases',
    label: 'Failure cases',
    unit: '건',
    value: null,
    method: '놓침, 충돌, 위치 오차 등 원인별로 분류해 기록',
  },
  {
    id: 'sim-vs-real',
    label: 'Sim vs Real gap',
    unit: '%p',
    value: null,
    method: '같은 작업의 시뮬레이션 성공률과 실제 성공률 차이',
  },
]

export const TASK_EXAMPLES = [
  { title: '계산대 소형 물품 정리', body: '계산대 위에 놓인 작은 상품을 집어 지정한 트레이로 옮깁니다.' },
  { title: '작업대 부자재 공급', body: '포장에 쓰는 부자재를 작업자 손이 닿는 위치로 가져다 놓습니다.' },
  { title: '진열 전 상품 분류', body: '입고된 상품을 종류별 칸으로 나눠 담습니다.' },
]

/** 실험 기록. 실험을 하면 여기에 한 줄씩 추가한다. */
export interface ExperimentLog {
  date: string
  task: string
  trials: number
  success: number
  note: string
  kind: 'SIMULATION' | 'REAL'
}

export const EXPERIMENT_LOG: ExperimentLog[] = [
  {
    date: '2026-11-05',
    task: '작업대 3 cm 상자 Pick & Place',
    trials: 1,
    success: 1,
    note: 'Isaac Sim 6.2. 접촉·마찰 그립(보조 없음), 들어 올림 7.3 cm, 놓기 위치 오차 1.4 mm',
    kind: 'SIMULATION',
  },
  {
    date: '2026-11-05',
    task: '작업대 3 cm 상자 Pick & Place (데모 영상 촬영 회차)',
    trials: 1,
    success: 1,
    note: 'Isaac Sim 6.2. 접촉·마찰 그립(보조 없음), 들어 올림 8.3 cm, 놓기 위치 오차 2.2 mm',
    kind: 'SIMULATION',
  },
]
