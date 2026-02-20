import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Malay. */
export const ms: MonitoringTranslations = {
  'monitoring.error.noProvider':
    'Penyedia pemantauan tidak dikonfigurasi. Panggil setProvider() dahulu.',
  'monitoring.check.database.notBonded': 'Ikatan pangkalan data tidak dikonfigurasi.',
  'monitoring.check.database.poolUnavailable': 'Pool pangkalan data tidak tersedia.',
  'monitoring.check.cache.notBonded': 'Ikatan cache tidak dikonfigurasi.',
  'monitoring.check.cache.providerUnavailable': 'Pembekal cache tidak tersedia.',
  'monitoring.check.http.badStatus': 'Respons HTTP {{status}}.',
  'monitoring.check.http.timeout': 'Permintaan tamat masa.',
  'monitoring.check.http.degraded':
    'Masa respons {{latencyMs}}ms melebihi ambang {{thresholdMs}}ms.',
  'monitoring.check.bond.notBonded': "Ikatan '{{bondType}}' tidak didaftarkan.",
  'monitoring.check.timedOut': 'Semakan tamat masa selepas {{timeoutMs}}ms.',
}
