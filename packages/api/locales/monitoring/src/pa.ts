import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Punjabi. */
export const pa: MonitoringTranslations = {
  'monitoring.error.noProvider': 'Monitoring provider not configured. Call setProvider() first.',
  'monitoring.check.database.notBonded': 'Database bond not configured.',
  'monitoring.check.database.poolUnavailable': 'ਡੇਟਾਬੇਸ ਪੂਲ ਉਪਲਬਧ ਨਹੀਂ ਹੈ।',
  'monitoring.check.cache.notBonded': 'Cache bond not configured.',
  'monitoring.check.cache.providerUnavailable': 'ਕੈਸ਼ ਪ੍ਰਦਾਤਾ ਉਪਲਬਧ ਨਹੀਂ ਹੈ।',
  'monitoring.check.http.badStatus': 'HTTP {{status}} response.',
  'monitoring.check.http.timeout': 'Request timed out.',
  'monitoring.check.http.degraded': 'ਜਵਾਬ ਸਮਾਂ {{latencyMs}}ms ਸੀਮਾ {{thresholdMs}}ms ਤੋਂ ਵੱਧ ਗਿਆ।',
  'monitoring.check.bond.notBonded': "Bond '{{bondType}}' is not registered.",
  'monitoring.check.timedOut': '{{timeoutMs}}ms ਤੋਂ ਬਾਅਦ ਜਾਂਚ ਦਾ ਸਮਾਂ ਸਮਾਪਤ ਹੋ ਗਿਆ।',
}
