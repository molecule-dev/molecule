import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Dutch. */
export const nl: MonitoringTranslations = {
  'monitoring.error.noProvider':
    'Monitoringprovider niet geconfigureerd. Roep eerst setProvider() aan.',
  'monitoring.check.database.notBonded': 'Databaseverbinding niet geconfigureerd.',
  'monitoring.check.database.poolUnavailable': 'Databasepool niet beschikbaar.',
  'monitoring.check.cache.notBonded': 'Cacheverbinding niet geconfigureerd.',
  'monitoring.check.cache.providerUnavailable': 'Cacheprovider niet beschikbaar.',
  'monitoring.check.http.badStatus': 'HTTP {{status}} antwoord.',
  'monitoring.check.http.timeout': 'Verzoek verlopen.',
  'monitoring.check.http.degraded':
    'Responstijd {{latencyMs}}ms overschreed drempel {{thresholdMs}}ms.',
  'monitoring.check.bond.notBonded': "Verbinding '{{bondType}}' is niet geregistreerd.",
  'monitoring.check.timedOut': 'Controle verlopen na {{timeoutMs}}ms.',
}
