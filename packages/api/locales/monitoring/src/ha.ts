import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Hausa. */
export const ha: MonitoringTranslations = {
  'monitoring.error.noProvider': 'Monitoring provider not configured. Call setProvider() first.',
  'monitoring.check.database.notBonded': 'Database bond not configured.',
  'monitoring.check.database.poolUnavailable': 'Tafkin bayanai ba ya samuwa.',
  'monitoring.check.cache.notBonded': 'Cache bond not configured.',
  'monitoring.check.cache.providerUnavailable': 'Mai ba da cache ba ya samuwa.',
  'monitoring.check.http.badStatus': 'HTTP {{status}} response.',
  'monitoring.check.http.timeout': 'Request timed out.',
  'monitoring.check.http.degraded': 'Lokacin amsa {{latencyMs}}ms ya wuce iyaka {{thresholdMs}}ms.',
  'monitoring.check.bond.notBonded': "Bond '{{bondType}}' is not registered.",
  'monitoring.check.timedOut': 'Dubawa ta ƙare bayan {{timeoutMs}}ms.',
}
