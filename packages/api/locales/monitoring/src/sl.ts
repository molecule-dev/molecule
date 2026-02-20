import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Slovenian. */
export const sl: MonitoringTranslations = {
  'monitoring.error.noProvider':
    'Ponudnik nadzora ni konfiguriran. Najprej pokličite setProvider().',
  'monitoring.check.database.notBonded': 'Povezava s podatkovno bazo ni konfigurirana.',
  'monitoring.check.database.poolUnavailable': 'Bazen podatkovne baze ni na voljo.',
  'monitoring.check.cache.notBonded': 'Povezava s predpomnilnikom ni konfigurirana.',
  'monitoring.check.cache.providerUnavailable': 'Ponudnik predpomnilnika ni na voljo.',
  'monitoring.check.http.badStatus': 'HTTP {{status}} odgovor.',
  'monitoring.check.http.timeout': 'Zahteva je potekla.',
  'monitoring.check.http.degraded':
    'Odzivni čas {{latencyMs}}ms je presegel prag {{thresholdMs}}ms.',
  'monitoring.check.bond.notBonded': "Povezava '{{bondType}}' ni registrirana.",
  'monitoring.check.timedOut': 'Preverjanje je poteklo po {{timeoutMs}}ms.',
}
