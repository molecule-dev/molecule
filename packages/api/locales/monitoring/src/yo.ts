import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Yoruba. */
export const yo: MonitoringTranslations = {
  'monitoring.error.noProvider': 'Olùpèsè àmójútó kò tí ṣètò. Pe setProvider() ní àkọ́kọ́.',
  'monitoring.check.database.notBonded': 'Ìsopọ̀ dátà kò tí ṣètò.',
  'monitoring.check.database.poolUnavailable': 'Adágún àkójọpọ̀ dátà kò sí.',
  'monitoring.check.cache.notBonded': 'Ìsopọ̀ cache kò tí ṣètò.',
  'monitoring.check.cache.providerUnavailable': 'Olùpèsè cache kò sí.',
  'monitoring.check.http.badStatus': 'HTTP {{status}} ìdáhùn.',
  'monitoring.check.http.timeout': 'Ìbéèrè ti parí àkókò.',
  'monitoring.check.http.degraded': 'Àkókò ìdáhùn {{latencyMs}}ms kọjá ààlà {{thresholdMs}}ms.',
  'monitoring.check.bond.notBonded': "Bond '{{bondType}}' kò tí forúkọsílẹ̀.",
  'monitoring.check.timedOut': 'Àyẹ̀wò parí lẹ́yìn {{timeoutMs}}ms.',
}
