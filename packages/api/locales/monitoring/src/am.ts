import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Amharic. */
export const am: MonitoringTranslations = {
  'monitoring.error.noProvider': 'Monitoring provider not configured. Call setProvider() first.',
  'monitoring.check.database.notBonded': 'Database bond not configured.',
  'monitoring.check.database.poolUnavailable': 'የዳታቤዝ ፑል አይገኝም።',
  'monitoring.check.cache.notBonded': 'Cache bond not configured.',
  'monitoring.check.cache.providerUnavailable': 'የካሽ አቅራቢ አይገኝም።',
  'monitoring.check.http.badStatus': 'HTTP {{status}} response.',
  'monitoring.check.http.timeout': 'Request timed out.',
  'monitoring.check.http.degraded': 'የምላሽ ጊዜ {{latencyMs}}ms ከገደብ {{thresholdMs}}ms አልፏል።',
  'monitoring.check.bond.notBonded': "Bond '{{bondType}}' is not registered.",
  'monitoring.check.timedOut': 'ፍተሻ ከ{{timeoutMs}}ms በኋላ ጊዜው አልፏል።',
}
