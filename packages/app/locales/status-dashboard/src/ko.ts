import type { StatusDashboardTranslations } from './types.js'

/** StatusDashboard translations for ko. */
export const ko: Partial<StatusDashboardTranslations> = {
  'statusDashboard.label.operational': '정상',
  'statusDashboard.label.degraded': '성능 저하',
  'statusDashboard.label.down': '다운',
  'statusDashboard.label.unknown': '알 수 없음',
  'statusDashboard.label.services': '서비스',
  'statusDashboard.label.incidents': '인시던트',
  'statusDashboard.label.uptime': '가동 시간',
  'statusDashboard.error.noProvider': '상태 대시보드 제공자가 구성되지 않았습니다.',
  'statusDashboard.error.fetchFailed': 'HTTP 상태 정보를 가져오는 데 실패했습니다.<x> {{상태}}</x>',
  'statusDashboard.label.allOperational': '모든 시스템 정상 작동',
  'statusDashboard.label.someIssues': '일부 시스템에서 문제가 발생하고 있습니다.',
  'statusDashboard.label.majorOutage': '주요 시스템 장애',
  'statusDashboard.label.lastChecked': '마지막 확인<x> {{시간}}</x>',
  'statusDashboard.label.latency': '{{ms}} ms',
  'statusDashboard.label.noIncidents': '보고된 사건은 없습니다.',
}
