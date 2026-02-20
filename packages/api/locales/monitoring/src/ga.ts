import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Irish. */
export const ga: MonitoringTranslations = {
  'monitoring.error.noProvider': 'Monitoring provider not configured. Call setProvider() first.',
  'monitoring.check.database.notBonded': 'Database bond not configured.',
  'monitoring.check.database.poolUnavailable': 'Linn bunachar sonraí gan fáil.',
  'monitoring.check.cache.notBonded': 'Cache bond not configured.',
  'monitoring.check.cache.providerUnavailable': 'Soláthraí taisce gan fáil.',
  'monitoring.check.http.badStatus': 'HTTP {{status}} response.',
  'monitoring.check.http.timeout': 'Request timed out.',
  'monitoring.check.http.degraded':
    'Tháinig am freagartha {{latencyMs}}ms thar an tairseach {{thresholdMs}}ms.',
  'monitoring.check.bond.notBonded': "Bond '{{bondType}}' is not registered.",
  'monitoring.check.timedOut': 'Rinne an tseiceáil am istigh tar éis {{timeoutMs}}ms.',
}
