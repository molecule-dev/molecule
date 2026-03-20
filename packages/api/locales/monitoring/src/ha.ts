import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Hausa. */
export const ha: MonitoringTranslations = {
  'monitoring.error.noProvider':
    'Ba a saita mai ba da sabis na sa ido ba. Fara kira setProvider().',
  'monitoring.check.database.notBonded': 'Ba a saita haɗin bayanai ba.',
  'monitoring.check.database.poolUnavailable': 'Tafkin bayanai ba ya samuwa.',
  'monitoring.check.cache.notBonded': 'Ba a saita haɗin cache ba.',
  'monitoring.check.cache.providerUnavailable': 'Mai ba da cache ba ya samuwa.',
  'monitoring.check.http.badStatus': 'Amsar HTTP {{status}}.',
  'monitoring.check.http.timeout': 'Buƙatar ta ƙare lokaci.',
  'monitoring.check.http.degraded': 'Lokacin amsa {{latencyMs}}ms ya wuce iyaka {{thresholdMs}}ms.',
  'monitoring.check.bond.notBonded': "Bond '{{bondType}}' ba a yi rajista ba.",
  'monitoring.check.timedOut': 'Dubawa ta ƙare bayan {{timeoutMs}}ms.',
}
