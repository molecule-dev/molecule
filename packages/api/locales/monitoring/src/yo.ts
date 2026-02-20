import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Yoruba. */
export const yo: MonitoringTranslations = {
  'monitoring.error.noProvider': 'Monitoring provider not configured. Call setProvider() first.',
  'monitoring.check.database.notBonded': 'Database bond not configured.',
  'monitoring.check.database.poolUnavailable': 'Adágún àkójọpọ̀ dátà kò sí.',
  'monitoring.check.cache.notBonded': 'Cache bond not configured.',
  'monitoring.check.cache.providerUnavailable': 'Olùpèsè cache kò sí.',
  'monitoring.check.http.badStatus': 'HTTP {{status}} response.',
  'monitoring.check.http.timeout': 'Request timed out.',
  'monitoring.check.http.degraded': 'Àkókò ìdáhùn {{latencyMs}}ms kọjá ààlà {{thresholdMs}}ms.',
  'monitoring.check.bond.notBonded': "Bond '{{bondType}}' is not registered.",
  'monitoring.check.timedOut': 'Àyẹ̀wò parí lẹ́yìn {{timeoutMs}}ms.',
}
