import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Welsh. */
export const cy: MonitoringTranslations = {
  'monitoring.error.noProvider': 'Monitoring provider not configured. Call setProvider() first.',
  'monitoring.check.database.notBonded': 'Database bond not configured.',
  'monitoring.check.database.poolUnavailable': 'Cronfa ddata ddim ar gael.',
  'monitoring.check.cache.notBonded': 'Cache bond not configured.',
  'monitoring.check.cache.providerUnavailable': 'Darparwr storfa ddim ar gael.',
  'monitoring.check.http.badStatus': 'HTTP {{status}} response.',
  'monitoring.check.http.timeout': 'Request timed out.',
  'monitoring.check.http.degraded':
    'Amser ymateb {{latencyMs}}ms wedi rhagori ar y trothwy {{thresholdMs}}ms.',
  'monitoring.check.bond.notBonded': "Bond '{{bondType}}' is not registered.",
  'monitoring.check.timedOut': 'Gwiriad wedi amseru allan ar ôl {{timeoutMs}}ms.',
}
