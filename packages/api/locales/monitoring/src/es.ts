import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Spanish. */
export const es: MonitoringTranslations = {
  'monitoring.error.noProvider':
    'Proveedor de monitoreo no configurado. Llame a setProvider() primero.',
  'monitoring.check.database.notBonded': 'Enlace de base de datos no configurado.',
  'monitoring.check.database.poolUnavailable': 'Pool de base de datos no disponible.',
  'monitoring.check.cache.notBonded': 'Enlace de caché no configurado.',
  'monitoring.check.cache.providerUnavailable': 'Proveedor de caché no disponible.',
  'monitoring.check.http.badStatus': 'Respuesta HTTP {{status}}.',
  'monitoring.check.http.timeout': 'La solicitud ha expirado.',
  'monitoring.check.http.degraded':
    'Tiempo de respuesta {{latencyMs}}ms superó el umbral {{thresholdMs}}ms.',
  'monitoring.check.bond.notBonded': "El enlace '{{bondType}}' no está registrado.",
  'monitoring.check.timedOut': 'La verificación expiró después de {{timeoutMs}}ms.',
}
