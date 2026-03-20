import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Georgian. */
export const ka: MonitoringTranslations = {
  'monitoring.error.noProvider':
    'მონიტორინგის პროვაიდერი არ არის კონფიგურირებული. ჯერ გამოიძახეთ setProvider().',
  'monitoring.check.database.notBonded': 'მონაცემთა ბაზის bond არ არის კონფიგურირებული.',
  'monitoring.check.database.poolUnavailable': 'მონაცემთა ბაზის პული მიუწვდომელია.',
  'monitoring.check.cache.notBonded': 'ქეშის bond არ არის კონფიგურირებული.',
  'monitoring.check.cache.providerUnavailable': 'ქეშის პროვაიდერი მიუწვდომელია.',
  'monitoring.check.http.badStatus': 'HTTP {{status}} პასუხი.',
  'monitoring.check.http.timeout': 'მოთხოვნას დრო ამოიწურა.',
  'monitoring.check.http.degraded':
    'პასუხის დრო {{latencyMs}}ms გადააჭარბა ზღვარს {{thresholdMs}}ms.',
  'monitoring.check.bond.notBonded': "Bond '{{bondType}}' არ არის რეგისტრირებული.",
  'monitoring.check.timedOut': 'შემოწმება დროში ამოიწურა {{timeoutMs}}ms შემდეგ.',
}
