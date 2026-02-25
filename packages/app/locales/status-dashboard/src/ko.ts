import type { StatusDashboardTranslations } from './types.js'

/** Status dashboard translations for Korean. */
export const ko: StatusDashboardTranslations = {
  'statusDashboard.error.noProvider': '상태 대시보드 제공자가 구성되지 않았습니다.',
  'statusDashboard.error.fetchFailed': '상태를 가져오지 못했습니다: HTTP {{status}}',
  'statusDashboard.label.allOperational': '모든 시스템 정상 운영 중',
  'statusDashboard.label.someIssues': '일부 시스템에 문제가 발생하고 있습니다',
  'statusDashboard.label.majorOutage': '주요 시스템 장애',
  'statusDashboard.label.operational': '정상',
  'statusDashboard.label.degraded': '저하됨',
  'statusDashboard.label.down': '중단됨',
  'statusDashboard.label.unknown': '알 수 없음',
  'statusDashboard.label.services': '서비스',
  'statusDashboard.label.incidents': '인시던트',
  'statusDashboard.label.uptime': '가동 시간',
  'statusDashboard.label.lastChecked': '마지막 확인 {{time}}',
  'statusDashboard.label.latency': '{{ms}}ms',
  'statusDashboard.label.noIncidents': '보고된 인시던트가 없습니다.',
}
