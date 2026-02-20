import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Estonian. */
export const et: MonitoringTranslations = {
  'monitoring.error.noProvider': 'Seire pakkuja pole seadistatud. Kutsuge esmalt setProvider().',
  'monitoring.check.database.notBonded': 'Andmebaasi ühendus pole seadistatud.',
  'monitoring.check.database.poolUnavailable': 'Andmebaasi kogum pole saadaval.',
  'monitoring.check.cache.notBonded': 'Vahemälu ühendus pole seadistatud.',
  'monitoring.check.cache.providerUnavailable': 'Vahemälu pakkuja pole saadaval.',
  'monitoring.check.http.badStatus': 'HTTP {{status}} vastus.',
  'monitoring.check.http.timeout': 'Päringu aeg on läbi.',
  'monitoring.check.http.degraded': 'Vastuse aeg {{latencyMs}}ms ületas läve {{thresholdMs}}ms.',
  'monitoring.check.bond.notBonded': "Ühendus '{{bondType}}' pole registreeritud.",
  'monitoring.check.timedOut': 'Kontroll aegus pärast {{timeoutMs}}ms.',
}
