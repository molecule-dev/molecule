import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Icelandic. */
export const is: MonitoringTranslations = {
  'monitoring.error.noProvider': 'Monitoring provider not configured. Call setProvider() first.',
  'monitoring.check.database.notBonded': 'Database bond not configured.',
  'monitoring.check.database.poolUnavailable': 'Gagnagrunnshópur ekki tiltækur.',
  'monitoring.check.cache.notBonded': 'Cache bond not configured.',
  'monitoring.check.cache.providerUnavailable': 'Skyndiminnisveitandi ekki tiltækur.',
  'monitoring.check.http.badStatus': 'HTTP {{status}} response.',
  'monitoring.check.http.timeout': 'Request timed out.',
  'monitoring.check.http.degraded': 'Svartími {{latencyMs}}ms fór yfir þröskuld {{thresholdMs}}ms.',
  'monitoring.check.bond.notBonded': "Bond '{{bondType}}' is not registered.",
  'monitoring.check.timedOut': 'Athugun rann út eftir {{timeoutMs}}ms.',
}
