import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Khmer. */
export const km: MonitoringTranslations = {
  'monitoring.error.noProvider':
    'អ្នកផ្តល់ការតិតតាមមិនត្រូវបានកំណត់រចនាសម្ព័ន្ធ។ សូមហៅ setProvider() មុន។',
  'monitoring.check.database.notBonded': 'Bond មូលដ្ឋានទិន្នន័យមិនត្រូវបានកំណត់រចនាសម្ព័ន្ធ។',
  'monitoring.check.database.poolUnavailable': 'ក្រុមទិន្នន័យមិនអាចប្រើបាន។',
  'monitoring.check.cache.notBonded': 'Bond cache មិនត្រូវបានកំណត់រចនាសម្ព័ន្ធ។',
  'monitoring.check.cache.providerUnavailable': 'អ្នកផ្តល់ cache មិនអាចប្រើបាន។',
  'monitoring.check.http.badStatus': 'HTTP {{status}} ការតាប់។',
  'monitoring.check.http.timeout': 'សំណើអស់ពេល។',
  'monitoring.check.http.degraded': 'ពេលវេលាឆ្លើយតប {{latencyMs}}ms លើសពីកម្រិត {{thresholdMs}}ms។',
  'monitoring.check.bond.notBonded': "Bond '{{bondType}}' មិនត្រូវបានកត់ត្រា។",
  'monitoring.check.timedOut': 'ការត្រួតពិនិត្យអស់ពេលបន្ទាប់ពី {{timeoutMs}}ms។',
}
