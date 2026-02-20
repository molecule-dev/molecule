import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Danish. */
export const da: MonitoringTranslations = {
  'monitoring.error.noProvider': 'Overvågningsudbyder ikke konfigureret. Kald setProvider() først.',
  'monitoring.check.database.notBonded': 'Databaseforbindelse ikke konfigureret.',
  'monitoring.check.database.poolUnavailable': 'Databasepool utilgængelig.',
  'monitoring.check.cache.notBonded': 'Cacheforbindelse ikke konfigureret.',
  'monitoring.check.cache.providerUnavailable': 'Cache-udbyder utilgængelig.',
  'monitoring.check.http.badStatus': 'HTTP {{status}} svar.',
  'monitoring.check.http.timeout': 'Anmodningen fik timeout.',
  'monitoring.check.http.degraded': 'Svartid {{latencyMs}}ms overskred tærsklen {{thresholdMs}}ms.',
  'monitoring.check.bond.notBonded': "Forbindelsen '{{bondType}}' er ikke registreret.",
  'monitoring.check.timedOut': 'Kontrol fik timeout efter {{timeoutMs}}ms.',
}
