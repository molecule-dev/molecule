import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for Spanish. */
export const es: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    'Falta el nombre del paquete de Google Play (process.env.GOOGLE_PLAY_PACKAGE_NAME).',
  'payments.google.warn.missingServiceKey':
    'Falta el objeto de clave de servicio de la API de Google (process.env.GOOGLE_API_SERVICE_KEY_OBJECT).',
  'payments.google.error.serviceKeyNotConfigured':
    'Objeto de clave de servicio de la API de Google no configurado',
  'payments.google.error.parseServiceKey':
    'Error al analizar el objeto de clave de servicio de la API de Google:',
}
