import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Chinese (Simplified). */
export const zh: MonitoringTranslations = {
  'monitoring.error.noProvider': '监控提供者未配置。请先调用 setProvider()。',
  'monitoring.check.database.notBonded': '数据库连接未配置。',
  'monitoring.check.database.poolUnavailable': '数据库连接池不可用。',
  'monitoring.check.cache.notBonded': '缓存连接未配置。',
  'monitoring.check.cache.providerUnavailable': '缓存提供者不可用。',
  'monitoring.check.http.badStatus': 'HTTP {{status}} 响应。',
  'monitoring.check.http.timeout': '请求超时。',
  'monitoring.check.http.degraded': '响应时间{{latencyMs}}ms超过阈值{{thresholdMs}}ms。',
  'monitoring.check.bond.notBonded': "连接 '{{bondType}}' 未注册。",
  'monitoring.check.timedOut': '检查在{{timeoutMs}}ms后超时。',
}
