import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for Galician. */
export const gl: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    'Falta o nome do paquete de Google Play (process.env.GOOGLE_PLAY_PACKAGE_NAME).',
  'payments.google.warn.missingServiceKey':
    'Falta o obxecto de clave de servizo da API de Google (process.env.GOOGLE_API_SERVICE_KEY_OBJECT).',
  'payments.google.error.serviceKeyNotConfigured':
    'Obxecto de clave de servizo da API de Google non configurado',
  'payments.google.error.parseServiceKey':
    'Erro ao analizar o obxecto de clave de servizo da API de Google:',
}
