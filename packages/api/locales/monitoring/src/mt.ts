import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Maltese. */
export const mt: MonitoringTranslations = {
  'monitoring.error.noProvider': 'Monitoring provider not configured. Call setProvider() first.',
  'monitoring.check.database.notBonded': 'Database bond not configured.',
  'monitoring.check.database.poolUnavailable': 'Il-pool tad-database mhux disponibbli.',
  'monitoring.check.cache.notBonded': 'Cache bond not configured.',
  'monitoring.check.cache.providerUnavailable': 'Il-fornitur tal-cache mhux disponibbli.',
  'monitoring.check.http.badStatus': 'HTTP {{status}} response.',
  'monitoring.check.http.timeout': 'Request timed out.',
  'monitoring.check.http.degraded':
    "Il-ħin ta' risposta {{latencyMs}}ms qabeż il-limitu {{thresholdMs}}ms.",
  'monitoring.check.bond.notBonded': "Bond '{{bondType}}' is not registered.",
  'monitoring.check.timedOut': 'Il-kontroll skada wara {{timeoutMs}}ms.',
}
