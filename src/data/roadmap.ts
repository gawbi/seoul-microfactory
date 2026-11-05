import type { Status } from './types'

/*
 * 개발 로드맵. 단계가 진행되면 status와 progress만 수정한다.
 * progress는 실제 완료한 세부 작업 수(done)를 직접 적는다. 추정치는 넣지 않는다.
 */

export interface Phase {
  no: string
  title: string
  titleEn: string
  status: Status
  goal: string
  tasks: { label: string; done: boolean }[]
  deliverable: string
}

export const ROADMAP_UPDATED = '2026-11-05'

export const ROADMAP: Phase[] = [
  {
    no: '01',
    title: '공간 데이터 수집',
    titleEn: 'Spatial data acquisition',
    status: 'CONCEPT',
    goal: 'Go2 Ent-MTPTZ로 매장을 주행하며 짐벌 카메라 영상과 공간 데이터를 기록한다.',
    tasks: [
      { label: 'Go2 Ent-MTPTZ 센서 스트림 ROS 2 연동', done: false },
      { label: '매장 스캔 경로 설계', done: false },
      { label: '센서 로그 동기화·저장', done: false },
    ],
    deliverable: '동기화된 매장 센서 로그',
  },
  {
    no: '02',
    title: '매장 3D 재구성',
    titleEn: 'Store 3D reconstruction',
    status: 'CONCEPT',
    goal: '센서 로그로 매장을 포인트 클라우드와 메시로 복원한다.',
    tasks: [
      { label: 'SLAM으로 매장 지도 생성', done: false },
      { label: '포인트 클라우드 정합·정리', done: false },
      { label: '메시 변환과 치수 검증', done: false },
    ],
    deliverable: '매장 3D 모델',
  },
  {
    no: '03',
    title: 'Isaac Sim 디지털 트윈',
    titleEn: 'Isaac Sim digital twin',
    status: 'IN_DEVELOPMENT',
    goal: '복원한 매장을 USD로 옮겨 Isaac Sim에서 로봇을 시험할 수 있게 만든다.',
    tasks: [
      { label: '가상 매장 USD 씬 구성 (실측 전 가정 배치)', done: true },
      { label: '충돌·물리 속성 설정', done: true },
      { label: 'Go2 보행·SO-101 Pick & Place 시뮬레이션', done: true },
      { label: '실측 매장 데이터로 씬 교체', done: false },
    ],
    deliverable: '시뮬레이션 가능한 매장 디지털 트윈',
  },
  {
    no: '04',
    title: 'AI 자동화 시나리오 분석',
    titleEn: 'Automation scenario analysis',
    status: 'CONCEPT',
    goal: '공간 정보와 업무 정보를 합쳐 로봇이 맡을 작업을 고르고, 맞는 로봇과 도입 견적을 정리한다.',
    tasks: [
      { label: '운영자 인터뷰·작업 관찰 양식 정리', done: false },
      { label: '규칙 기반 후보 작업 선정', done: false },
      { label: '로봇 배치 시뮬레이션', done: false },
      { label: '추천 로봇·견적 산출 기준 정리', done: false },
    ],
    deliverable: '자동화 후보, 추천 로봇, 도입 견적',
  },
  {
    no: '05',
    title: 'SO-ARM101 실제 작업 검증',
    titleEn: 'Physical validation',
    status: 'CONCEPT',
    goal: '선정한 작업을 실제 매니퓰레이터로 반복 수행하고 시뮬레이션과 비교한다.',
    tasks: [
      { label: 'Pick & Place 작업 구성', done: false },
      { label: '반복 실험과 결과 기록', done: false },
      { label: 'Sim vs Real 비교 리포트', done: false },
    ],
    deliverable: '검증 결과 리포트',
  },
]
