import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Khmer. */
export const km: MonitoringTranslations = {
  'monitoring.error.noProvider': 'Monitoring provider not configured. Call setProvider() first.',
  'monitoring.check.database.notBonded': 'Database bond not configured.',
  'monitoring.check.database.poolUnavailable': 'ក្រុមទិន្នន័យមិនអាចប្រើបាន។',
  'monitoring.check.cache.notBonded': 'Cache bond not configured.',
  'monitoring.check.cache.providerUnavailable': 'អ្នកផ្តល់ cache មិនអាចប្រើបាន។',
  'monitoring.check.http.badStatus': 'HTTP {{status}} response.',
  'monitoring.check.http.timeout': 'Request timed out.',
  'monitoring.check.http.degraded': 'ពេលវេលាឆ្លើយតប {{latencyMs}}ms លើសពីកម្រិត {{thresholdMs}}ms។',
  'monitoring.check.bond.notBonded': "Bond '{{bondType}}' is not registered.",
  'monitoring.check.timedOut': 'ការត្រួតពិនិត្យអស់ពេលបន្ទាប់ពី {{timeoutMs}}ms។',
}
