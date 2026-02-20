import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Indonesian. */
export const id: MonitoringTranslations = {
  'monitoring.error.noProvider':
    'Penyedia pemantauan belum dikonfigurasi. Panggil setProvider() terlebih dahulu.',
  'monitoring.check.database.notBonded': 'Ikatan database belum dikonfigurasi.',
  'monitoring.check.database.poolUnavailable': 'Pool database tidak tersedia.',
  'monitoring.check.cache.notBonded': 'Ikatan cache belum dikonfigurasi.',
  'monitoring.check.cache.providerUnavailable': 'Penyedia cache tidak tersedia.',
  'monitoring.check.http.badStatus': 'Respons HTTP {{status}}.',
  'monitoring.check.http.timeout': 'Permintaan habis waktu.',
  'monitoring.check.http.degraded':
    'Waktu respons {{latencyMs}}ms melebihi ambang batas {{thresholdMs}}ms.',
  'monitoring.check.bond.notBonded': "Ikatan '{{bondType}}' belum terdaftar.",
  'monitoring.check.timedOut': 'Pemeriksaan habis waktu setelah {{timeoutMs}}ms.',
}
