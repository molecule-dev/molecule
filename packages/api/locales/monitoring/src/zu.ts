import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Zulu. */
export const zu: MonitoringTranslations = {
  'monitoring.error.noProvider': 'Umhlinzeki wokuhlola awulungisiwe. Shayela setProvider() kuqala.',
  'monitoring.check.database.notBonded': 'Ibhondi yedathabheyisi ayilungisiwe.',
  'monitoring.check.database.poolUnavailable': 'Iqoqo ledathabheyisi alitholakali.',
  'monitoring.check.cache.notBonded': 'Ibhondi ye-cache ayilungisiwe.',
  'monitoring.check.cache.providerUnavailable': 'Umhlinzeki we-cache akatholakali.',
  'monitoring.check.http.badStatus': 'HTTP {{status}} impendulo.',
  'monitoring.check.http.timeout': 'Isicelo siphelelwe yisikhathi.',
  'monitoring.check.http.degraded':
    'Isikhathi sokuphendula {{latencyMs}}ms sidlule umkhawulo {{thresholdMs}}ms.',
  'monitoring.check.bond.notBonded': "Ibhondi '{{bondType}}' ayibhaliswe.",
  'monitoring.check.timedOut': 'Ukuhlola kuphelelwe yisikhathi ngemuva kwe-{{timeoutMs}}ms.',
}
