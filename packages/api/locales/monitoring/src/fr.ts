import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for French. */
export const fr: MonitoringTranslations = {
  'monitoring.error.noProvider':
    "Le fournisseur de surveillance n'est pas configuré. Appelez d'abord setProvider().",
  'monitoring.check.database.notBonded': "La liaison de base de données n'est pas configurée.",
  'monitoring.check.database.poolUnavailable': 'Pool de base de données indisponible.',
  'monitoring.check.cache.notBonded': "La liaison de cache n'est pas configurée.",
  'monitoring.check.cache.providerUnavailable': 'Fournisseur de cache indisponible.',
  'monitoring.check.http.badStatus': 'Réponse HTTP {{status}}.',
  'monitoring.check.http.timeout': 'La requête a expiré.',
  'monitoring.check.http.degraded':
    'Le temps de réponse {{latencyMs}}ms a dépassé le seuil {{thresholdMs}}ms.',
  'monitoring.check.bond.notBonded': "La liaison '{{bondType}}' n'est pas enregistrée.",
  'monitoring.check.timedOut': 'La vérification a expiré après {{timeoutMs}}ms.',
}
