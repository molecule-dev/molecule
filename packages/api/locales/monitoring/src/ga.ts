import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Irish. */
export const ga: MonitoringTranslations = {
  'monitoring.error.noProvider':
    'Soláthraí monatóireachta gan cumrú. Glaoigh ar setProvider() ar dtús.',
  'monitoring.check.database.notBonded': 'Nasc bunachar sonraí gan cumrú.',
  'monitoring.check.database.poolUnavailable': 'Linn bunachar sonraí gan fáil.',
  'monitoring.check.cache.notBonded': 'Nasc taisce gan cumrú.',
  'monitoring.check.cache.providerUnavailable': 'Soláthraí taisce gan fáil.',
  'monitoring.check.http.badStatus': 'HTTP {{status}} freagra.',
  'monitoring.check.http.timeout': 'Rinne an iarratas am istigh.',
  'monitoring.check.http.degraded':
    'Tháinig am freagartha {{latencyMs}}ms thar an tairseach {{thresholdMs}}ms.',
  'monitoring.check.bond.notBonded': "Níl bond '{{bondType}}' cláraithe.",
  'monitoring.check.timedOut': 'Rinne an tseiceáil am istigh tar éis {{timeoutMs}}ms.',
}
