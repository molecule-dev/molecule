import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Norwegian Bokmal. */
export const nb: MonitoringTranslations = {
  'monitoring.error.noProvider':
    'Overvåkingsleverandør ikke konfigurert. Kall setProvider() først.',
  'monitoring.check.database.notBonded': 'Databaseforbindelse ikke konfigurert.',
  'monitoring.check.database.poolUnavailable': 'Databasepool utilgjengelig.',
  'monitoring.check.cache.notBonded': 'Bufferforbindelse ikke konfigurert.',
  'monitoring.check.cache.providerUnavailable': 'Cache-leverandør utilgjengelig.',
  'monitoring.check.http.badStatus': 'HTTP {{status}} svar.',
  'monitoring.check.http.timeout': 'Forespørselen fikk tidsavbrudd.',
  'monitoring.check.http.degraded':
    'Responstid {{latencyMs}}ms overskred terskelen {{thresholdMs}}ms.',
  'monitoring.check.bond.notBonded': "Forbindelsen '{{bondType}}' er ikke registrert.",
  'monitoring.check.timedOut': 'Sjekken fikk tidsavbrudd etter {{timeoutMs}}ms.',
}
