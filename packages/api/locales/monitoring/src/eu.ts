import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Basque. */
export const eu: MonitoringTranslations = {
  'monitoring.error.noProvider':
    'Monitorizazio-hornitzailea ez dago konfiguratuta. Lehenik setProvider() deitu.',
  'monitoring.check.database.notBonded': 'Datu-basearen bond-a ez dago konfiguratuta.',
  'monitoring.check.database.poolUnavailable': 'Datu-basearen pool-a ez dago eskuragarri.',
  'monitoring.check.cache.notBonded': 'Cache bond-a ez dago konfiguratuta.',
  'monitoring.check.cache.providerUnavailable': 'Cache hornitzailea ez dago eskuragarri.',
  'monitoring.check.http.badStatus': 'HTTP {{status}} erantzuna.',
  'monitoring.check.http.timeout': 'Eskaerak denbora-muga gainditu du.',
  'monitoring.check.http.degraded':
    'Erantzun-denbora {{latencyMs}}ms atalasea {{thresholdMs}}ms gainditu du.',
  'monitoring.check.bond.notBonded': "Bond '{{bondType}}' ez dago erregistratuta.",
  'monitoring.check.timedOut': 'Egiaztapenak denbora-muga gainditu du {{timeoutMs}}ms ondoren.',
}
