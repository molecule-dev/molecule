import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Swahili. */
export const sw: MonitoringTranslations = {
  'monitoring.error.noProvider':
    'Mtoa huduma wa ufuatiliaji haijasanidiwa. Piga setProvider() kwanza.',
  'monitoring.check.database.notBonded': 'Muunganisho wa hifadhidata haijasanidiwa.',
  'monitoring.check.database.poolUnavailable': 'Dimbwi la hifadhidata halipatikani.',
  'monitoring.check.cache.notBonded': 'Muunganisho wa cache haijasanidiwa.',
  'monitoring.check.cache.providerUnavailable': 'Mtoa huduma wa kashe hapatikani.',
  'monitoring.check.http.badStatus': 'Jibu la HTTP {{status}}.',
  'monitoring.check.http.timeout': 'Ombi limekwisha muda.',
  'monitoring.check.http.degraded':
    'Muda wa majibu {{latencyMs}}ms ulizidi kiwango {{thresholdMs}}ms.',
  'monitoring.check.bond.notBonded': "Muunganisho '{{bondType}}' haujasajiliwa.",
  'monitoring.check.timedOut': 'Ukaguzi uliisha muda baada ya {{timeoutMs}}ms.',
}
