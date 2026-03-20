import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Maltese. */
export const mt: MonitoringTranslations = {
  'monitoring.error.noProvider':
    'Il-fornitur tal-monitoraġġ mhux konfigurat. Sejjaħ setProvider() l-ewwel.',
  'monitoring.check.database.notBonded': 'Il-bond tad-database mhux konfigurat.',
  'monitoring.check.database.poolUnavailable': 'Il-pool tad-database mhux disponibbli.',
  'monitoring.check.cache.notBonded': 'Il-bond tal-cache mhux konfigurat.',
  'monitoring.check.cache.providerUnavailable': 'Il-fornitur tal-cache mhux disponibbli.',
  'monitoring.check.http.badStatus': 'Risposta HTTP {{status}}.',
  'monitoring.check.http.timeout': 'It-talba skadiet.',
  'monitoring.check.http.degraded':
    "Il-ħin ta' risposta {{latencyMs}}ms qabeż il-limitu {{thresholdMs}}ms.",
  'monitoring.check.bond.notBonded': "Il-bond '{{bondType}}' mhux irreġistrat.",
  'monitoring.check.timedOut': 'Il-kontroll skada wara {{timeoutMs}}ms.',
}
