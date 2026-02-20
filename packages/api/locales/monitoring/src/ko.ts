import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Korean. */
export const ko: MonitoringTranslations = {
  'monitoring.error.noProvider':
    '모니터링 프로바이더가 구성되지 않았습니다. 먼저 setProvider()를 호출하세요.',
  'monitoring.check.database.notBonded': '데이터베이스 본드가 구성되지 않았습니다.',
  'monitoring.check.database.poolUnavailable': '데이터베이스 풀을 사용할 수 없습니다.',
  'monitoring.check.cache.notBonded': '캐시 본드가 구성되지 않았습니다.',
  'monitoring.check.cache.providerUnavailable': '캐시 공급자를 사용할 수 없습니다.',
  'monitoring.check.http.badStatus': 'HTTP {{status}} 응답.',
  'monitoring.check.http.timeout': '요청 시간이 초과되었습니다.',
  'monitoring.check.http.degraded':
    '응답 시간 {{latencyMs}}ms가 임계값 {{thresholdMs}}ms를 초과했습니다.',
  'monitoring.check.bond.notBonded': "'{{bondType}}' 본드가 등록되지 않았습니다.",
  'monitoring.check.timedOut': '{{timeoutMs}}ms 후 검사 시간이 초과되었습니다.',
}
