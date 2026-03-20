import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Amharic. */
export const am: MonitoringTranslations = {
  'monitoring.error.noProvider': 'የክትትል አቅራቢ አልተዋቀረም። መጀመሪያ setProvider() ይደውሉ።',
  'monitoring.check.database.notBonded': 'የዳታቤዝ ቦንድ አልተዋቀረም።',
  'monitoring.check.database.poolUnavailable': 'የዳታቤዝ ፑል አይገኝም።',
  'monitoring.check.cache.notBonded': 'የካሽ ቦንድ አልተዋቀረም።',
  'monitoring.check.cache.providerUnavailable': 'የካሽ አቅራቢ አይገኝም።',
  'monitoring.check.http.badStatus': 'HTTP {{status}} ምላሽ።',
  'monitoring.check.http.timeout': 'ጥያቄው ጊዜው አልፏል።',
  'monitoring.check.http.degraded': 'የምላሽ ጊዜ {{latencyMs}}ms ከገደብ {{thresholdMs}}ms አልፏል።',
  'monitoring.check.bond.notBonded': "ቦንድ '{{bondType}}' አልተመዘገበም።",
  'monitoring.check.timedOut': 'ፍተሻ ከ{{timeoutMs}}ms በኋላ ጊዜው አልፏል።',
}
