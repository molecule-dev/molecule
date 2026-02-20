import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Italian. */
export const it: MonitoringTranslations = {
  'monitoring.error.noProvider':
    'Provider di monitoraggio non configurato. Chiamare prima setProvider().',
  'monitoring.check.database.notBonded': 'Collegamento al database non configurato.',
  'monitoring.check.database.poolUnavailable': 'Pool del database non disponibile.',
  'monitoring.check.cache.notBonded': 'Collegamento alla cache non configurato.',
  'monitoring.check.cache.providerUnavailable': 'Provider della cache non disponibile.',
  'monitoring.check.http.badStatus': 'Risposta HTTP {{status}}.',
  'monitoring.check.http.timeout': 'Richiesta scaduta.',
  'monitoring.check.http.degraded':
    'Tempo di risposta {{latencyMs}}ms ha superato la soglia {{thresholdMs}}ms.',
  'monitoring.check.bond.notBonded': "Il collegamento '{{bondType}}' non è registrato.",
  'monitoring.check.timedOut': 'Il controllo è scaduto dopo {{timeoutMs}}ms.',
}
