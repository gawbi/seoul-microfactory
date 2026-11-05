/*
 * 배포 관련 설정. 저장소가 정해지면 REPO_URL만 채우면 된다.
 * 배포 경로(base)는 vite.config.ts가 CI 환경변수 VITE_BASE에서 읽는다.
 */

export const SITE = {
  name: 'SEOUL MICROFACTORY',
  url: import.meta.env.VITE_SITE_URL || '',
  repoUrl: '', // 예: https://github.com/<owner>/seoul-microfactory
  contact: '',
  year: 2026,
}

/** public/ 아래 파일 경로를 배포 경로에 맞게 바꿔 준다. */
export const asset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`
