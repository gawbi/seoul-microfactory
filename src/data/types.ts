/** 기능·모듈 진행 상태. 실제로 돌려 보고 확인한 것만 VERIFIED로 바꾼다. */
export type Status = 'CONCEPT' | 'IN_DEVELOPMENT' | 'VERIFIED'

/** 기술 스택 사용 상태. */
export type TechStatus = 'IN_USE' | 'PLANNED' | 'CONSIDERING'

/**
 * 미디어 출처 구분. 사이트 어디서든 이 라벨이 함께 표시된다.
 * - REAL_PHOTO: 실제로 촬영된 사진 (제3자 사진 포함, 크레딧 필수)
 * - SIMULATION: Isaac Sim 등에서 렌더링한 화면
 * - CONCEPT: 이해를 돕기 위해 직접 그린 시각화
 * - RECONSTRUCTION: 실제 수집 데이터로 재구성한 결과
 */
export type MediaKind = 'REAL_PHOTO' | 'SIMULATION' | 'CONCEPT' | 'RECONSTRUCTION'

export const STATUS_LABEL: Record<Status, string> = {
  CONCEPT: 'Concept',
  IN_DEVELOPMENT: 'In development',
  VERIFIED: 'Verified',
}

export const TECH_STATUS_LABEL: Record<TechStatus, string> = {
  IN_USE: 'In use',
  PLANNED: 'Planned',
  CONSIDERING: 'Under consideration',
}

export const MEDIA_KIND_LABEL: Record<MediaKind, string> = {
  REAL_PHOTO: 'Real photo',
  SIMULATION: 'Simulation',
  CONCEPT: 'Concept visual',
  RECONSTRUCTION: 'Reconstruction',
}
