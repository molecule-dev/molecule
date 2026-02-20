import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Chinese (Traditional). */
export const zhTW: MonitoringTranslations = {
  'monitoring.error.noProvider': '監控提供者未設定。請先呼叫 setProvider()。',
  'monitoring.check.database.notBonded': '資料庫連結未設定。',
  'monitoring.check.database.poolUnavailable': '資料庫連線池無法使用。',
  'monitoring.check.cache.notBonded': '快取連結未設定。',
  'monitoring.check.cache.providerUnavailable': '快取提供者無法使用。',
  'monitoring.check.http.badStatus': 'HTTP {{status}} 回應。',
  'monitoring.check.http.timeout': '請求逾時。',
  'monitoring.check.http.degraded': '回應時間{{latencyMs}}ms超過閾值{{thresholdMs}}ms。',
  'monitoring.check.bond.notBonded': "連結 '{{bondType}}' 未註冊。",
  'monitoring.check.timedOut': '檢查在{{timeoutMs}}ms後逾時。',
}
