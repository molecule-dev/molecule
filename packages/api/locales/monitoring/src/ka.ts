import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Georgian. */
export const ka: MonitoringTranslations = {
  'monitoring.error.noProvider': 'Monitoring provider not configured. Call setProvider() first.',
  'monitoring.check.database.notBonded': 'Database bond not configured.',
  'monitoring.check.database.poolUnavailable': 'მონაცემთა ბაზის პული მიუწვდომელია.',
  'monitoring.check.cache.notBonded': 'Cache bond not configured.',
  'monitoring.check.cache.providerUnavailable': 'ქეშის პროვაიდერი მიუწვდომელია.',
  'monitoring.check.http.badStatus': 'HTTP {{status}} response.',
  'monitoring.check.http.timeout': 'Request timed out.',
  'monitoring.check.http.degraded':
    'პასუხის დრო {{latencyMs}}ms გადააჭარბა ზღვარს {{thresholdMs}}ms.',
  'monitoring.check.bond.notBonded': "Bond '{{bondType}}' is not registered.",
  'monitoring.check.timedOut': 'შემოწმება დროში ამოიწურა {{timeoutMs}}ms შემდეგ.',
}
