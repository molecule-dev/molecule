import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Punjabi. */
export const pa: MonitoringTranslations = {
  'monitoring.error.noProvider': 'ਮੋਨਿਟਰਿੰਗ ਪ੍ਰਦਾਤਾ ਕਨ੍ਫਿਗਰ ਨਹੀਂ ਹੈ। ਪਹਿਲਾਂ setProvider() ਕਾਲ ਕਰੋ।',
  'monitoring.check.database.notBonded': 'ਡੇਟਾਬੇਸ ਬਾਂਡ ਕਨ੍ਫਿਗਰ ਨਹੀਂ ਹੈ।',
  'monitoring.check.database.poolUnavailable': 'ਡੇਟਾਬੇਸ ਪੂਲ ਉਪਲਬਧ ਨਹੀਂ ਹੈ।',
  'monitoring.check.cache.notBonded': 'ਕੈਸ਼ ਬਾਂਡ ਕਨ੍ਫਿਗਰ ਨਹੀਂ ਹੈ।',
  'monitoring.check.cache.providerUnavailable': 'ਕੈਸ਼ ਪ੍ਰਦਾਤਾ ਉਪਲਬਧ ਨਹੀਂ ਹੈ।',
  'monitoring.check.http.badStatus': 'HTTP {{status}} ਜਵਾਬ।',
  'monitoring.check.http.timeout': 'ਬੇਨਤੀ ਦਾ ਸਮਾਂ ਸਮਾਪਤ ਹੋ ਗਿਆ।',
  'monitoring.check.http.degraded': 'ਜਵਾਬ ਸਮਾਂ {{latencyMs}}ms ਸੀਮਾ {{thresholdMs}}ms ਤੋਂ ਵੱਧ ਗਿਆ।',
  'monitoring.check.bond.notBonded': "Bond '{{bondType}}' ਰਜਿਸਟਰਡ ਨਹੀਂ ਹੈ।",
  'monitoring.check.timedOut': '{{timeoutMs}}ms ਤੋਂ ਬਾਅਦ ਜਾਂਚ ਦਾ ਸਮਾਂ ਸਮਾਪਤ ਹੋ ਗਿਆ।',
}
