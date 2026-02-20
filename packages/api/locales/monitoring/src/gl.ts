import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Galician. */
export const gl: MonitoringTranslations = {
  'monitoring.error.noProvider':
    'O provedor de monitorización non está configurado. Chame a setProvider() primeiro.',
  'monitoring.check.database.notBonded': 'O enlace de base de datos non está configurado.',
  'monitoring.check.database.poolUnavailable': 'O pool de base de datos non está dispoñible.',
  'monitoring.check.cache.notBonded': 'O enlace de caché non está configurado.',
  'monitoring.check.cache.providerUnavailable': 'O provedor de caché non está dispoñible.',
  'monitoring.check.http.badStatus': 'Resposta HTTP {{status}}.',
  'monitoring.check.http.timeout': 'A solicitude expirou.',
  'monitoring.check.http.degraded':
    'O tempo de resposta {{latencyMs}}ms superou o limiar {{thresholdMs}}ms.',
  'monitoring.check.bond.notBonded': "O enlace '{{bondType}}' non está rexistrado.",
  'monitoring.check.timedOut': 'A verificación expirou despois de {{timeoutMs}}ms.',
}
