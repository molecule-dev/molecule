import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Icelandic. */
export const is: MonitoringTranslations = {
  'monitoring.error.noProvider': 'Eftirlitsveita ekki stillt. Kallu á setProvider() fyrst.',
  'monitoring.check.database.notBonded': 'Gagnagrunnsbinding ekki stillt.',
  'monitoring.check.database.poolUnavailable': 'Gagnagrunnshópur ekki tiltækur.',
  'monitoring.check.cache.notBonded': 'Skyndiminnisbinding ekki stillt.',
  'monitoring.check.cache.providerUnavailable': 'Skyndiminnisveitandi ekki tiltækur.',
  'monitoring.check.http.badStatus': 'HTTP {{status}} svar.',
  'monitoring.check.http.timeout': 'Beiðni rann út.',
  'monitoring.check.http.degraded': 'Svartími {{latencyMs}}ms fór yfir þröskuld {{thresholdMs}}ms.',
  'monitoring.check.bond.notBonded': "Binding '{{bondType}}' er ekki skráð.",
  'monitoring.check.timedOut': 'Athugun rann út eftir {{timeoutMs}}ms.',
}
