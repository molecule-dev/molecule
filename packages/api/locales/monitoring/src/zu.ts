import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Zulu. */
export const zu: MonitoringTranslations = {
  'monitoring.error.noProvider': 'Monitoring provider not configured. Call setProvider() first.',
  'monitoring.check.database.notBonded': 'Database bond not configured.',
  'monitoring.check.database.poolUnavailable': 'Iqoqo ledathabheyisi alitholakali.',
  'monitoring.check.cache.notBonded': 'Cache bond not configured.',
  'monitoring.check.cache.providerUnavailable': 'Umhlinzeki we-cache akatholakali.',
  'monitoring.check.http.badStatus': 'HTTP {{status}} response.',
  'monitoring.check.http.timeout': 'Request timed out.',
  'monitoring.check.http.degraded':
    'Isikhathi sokuphendula {{latencyMs}}ms sidlule umkhawulo {{thresholdMs}}ms.',
  'monitoring.check.bond.notBonded': "Bond '{{bondType}}' is not registered.",
  'monitoring.check.timedOut': 'Ukuhlola kuphelelwe yisikhathi ngemuva kwe-{{timeoutMs}}ms.',
}
