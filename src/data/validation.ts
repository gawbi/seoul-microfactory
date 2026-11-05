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
    label: '작업 성공률',
    unit: '%',
    value: null,
    method: '같은 Pick & Place를 정해진 횟수만큼 반복해 성공 비율을 기록',
  },
  {
    id: 'cycle-time',
    label: '평균 사이클 타임',
    unit: 's',
    value: null,
    method: '집기 시작부터 내려놓기 완료까지의 시간 평균',
  },
  {
    id: 'failure-cases',
    label: '실패 사례',
    unit: '건',
    value: null,
    method: '놓침, 충돌, 위치 오차 등 원인별로 분류해 기록',
  },
  {
    id: 'sim-vs-real',
    label: '시뮬레이션과 실제의 차이',
    unit: '%p',
    value: null,
    method: '같은 작업의 시뮬레이션 성공률과 실제 성공률 차이',
  },
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
    task: '작업대 3 cm 상자 Pick & Place (데모 영상 회차)',
    trials: 1,
    success: 1,
    note: 'Isaac Sim 6.2. 접촉·마찰 그립(보조 없음), 들어 올림 8.3 cm, 놓기 위치 오차 2.2 mm',
    kind: 'SIMULATION',
  },
  {
    date: '2026-11-05',
    task: '작업대 3 cm 상자 Pick & Place (재학습한 보행 정책으로 데모 재촬영)',
    trials: 1,
    success: 1,
    note: 'Isaac Sim 6.2. 접촉·마찰 그립(보조 없음), 들어 올림 8.3 cm, 놓기 위치 오차 2.1 mm',
    kind: 'SIMULATION',
  },
]
