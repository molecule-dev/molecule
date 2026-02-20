import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Catalan. */
export const ca: MonitoringTranslations = {
  'monitoring.error.noProvider':
    'El proveïdor de monitoratge no està configurat. Crida setProvider() primer.',
  'monitoring.check.database.notBonded': "L'enllaç de base de dades no està configurat.",
  'monitoring.check.database.poolUnavailable': 'El pool de base de dades no està disponible.',
  'monitoring.check.cache.notBonded': "L'enllaç de memòria cau no està configurat.",
  'monitoring.check.cache.providerUnavailable': 'El proveïdor de memòria cau no està disponible.',
  'monitoring.check.http.badStatus': 'Resposta HTTP {{status}}.',
  'monitoring.check.http.timeout': "La sol·licitud ha exhaurit el temps d'espera.",
  'monitoring.check.http.degraded':
    'El temps de resposta {{latencyMs}}ms ha superat el llindar {{thresholdMs}}ms.',
  'monitoring.check.bond.notBonded': "L'enllaç '{{bondType}}' no està registrat.",
  'monitoring.check.timedOut': 'La comprovació ha expirat després de {{timeoutMs}}ms.',
}
