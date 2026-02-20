import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Uzbek. */
export const uz: MonitoringTranslations = {
  'monitoring.error.noProvider':
    'Monitoring provayderi sozlanmagan. Avval setProvider() ni chaqiring.',
  'monitoring.check.database.notBonded': "Ma'lumotlar bazasi aloqasi sozlanmagan.",
  'monitoring.check.database.poolUnavailable': "Ma'lumotlar bazasi hovuzi mavjud emas.",
  'monitoring.check.cache.notBonded': 'Kesh aloqasi sozlanmagan.',
  'monitoring.check.cache.providerUnavailable': 'Kesh provayderi mavjud emas.',
  'monitoring.check.http.badStatus': 'HTTP {{status}} javobi.',
  'monitoring.check.http.timeout': "So'rov vaqti tugadi.",
  'monitoring.check.http.degraded':
    "Javob vaqti {{latencyMs}}ms chegarani {{thresholdMs}}ms oshib o'tdi.",
  'monitoring.check.bond.notBonded': "'{{bondType}}' aloqasi ro'yxatdan o'tmagan.",
  'monitoring.check.timedOut': "Tekshirish {{timeoutMs}}ms dan so'ng vaqti tugadi.",
}
