import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Basque. */
export const eu: MonitoringTranslations = {
  'monitoring.error.noProvider': 'Monitoring provider not configured. Call setProvider() first.',
  'monitoring.check.database.notBonded': 'Database bond not configured.',
  'monitoring.check.database.poolUnavailable': 'Datu-basearen pool-a ez dago eskuragarri.',
  'monitoring.check.cache.notBonded': 'Cache bond not configured.',
  'monitoring.check.cache.providerUnavailable': 'Cache hornitzailea ez dago eskuragarri.',
  'monitoring.check.http.badStatus': 'HTTP {{status}} response.',
  'monitoring.check.http.timeout': 'Request timed out.',
  'monitoring.check.http.degraded':
    'Erantzun-denbora {{latencyMs}}ms atalasea {{thresholdMs}}ms gainditu du.',
  'monitoring.check.bond.notBonded': "Bond '{{bondType}}' is not registered.",
  'monitoring.check.timedOut': 'Egiaztapenak denbora-muga gainditu du {{timeoutMs}}ms ondoren.',
}
