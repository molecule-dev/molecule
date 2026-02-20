import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for English. */
export const en: MonitoringTranslations = {
  'monitoring.error.noProvider': 'Monitoring provider not configured. Call setProvider() first.',
  'monitoring.check.database.notBonded': 'Database bond not configured.',
  'monitoring.check.database.poolUnavailable': 'Database pool unavailable.',
  'monitoring.check.cache.notBonded': 'Cache bond not configured.',
  'monitoring.check.cache.providerUnavailable': 'Cache provider unavailable.',
  'monitoring.check.http.badStatus': 'HTTP {{status}} response.',
  'monitoring.check.http.timeout': 'Request timed out.',
  'monitoring.check.http.degraded':
    'Response time {{latencyMs}}ms exceeded threshold {{thresholdMs}}ms.',
  'monitoring.check.bond.notBonded': "Bond '{{bondType}}' is not registered.",
  'monitoring.check.timedOut': 'Check timed out after {{timeoutMs}}ms.',
}
