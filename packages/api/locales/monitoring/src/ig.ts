import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Igbo. */
export const ig: MonitoringTranslations = {
  'monitoring.error.noProvider': 'Onye na-enye nlele adịghị ahazi. Kpọọ setProvider() mbụ.',
  'monitoring.check.database.notBonded': 'Njikọ ọnụ data adịghị ahazi.',
  'monitoring.check.database.poolUnavailable': 'Ogba data adịghị.',
  'monitoring.check.cache.notBonded': 'Njikọ cache adịghị ahazi.',
  'monitoring.check.cache.providerUnavailable': 'Onye na-enye cache adịghị.',
  'monitoring.check.http.badStatus': 'HTTP {{status}} nzaghachi.',
  'monitoring.check.http.timeout': 'Arịrịọ ahụ gara oge.',
  'monitoring.check.http.degraded': 'Oge nzaghachi {{latencyMs}}ms gafere oke {{thresholdMs}}ms.',
  'monitoring.check.bond.notBonded': "Bond '{{bondType}}' adịghị edekọ aha.",
  'monitoring.check.timedOut': 'Nlele kwụsịrị mgbe {{timeoutMs}}ms gasịrị.',
}
