import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for Catalan. */
export const ca: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    'Falta el nom del paquet de Google Play (process.env.GOOGLE_PLAY_PACKAGE_NAME).',
  'payments.google.warn.missingServiceKey':
    "Falta l'objecte de clau de servei de l'API de Google (process.env.GOOGLE_API_SERVICE_KEY_OBJECT).",
  'payments.google.error.serviceKeyNotConfigured':
    "Objecte de clau de servei de l'API de Google no configurat",
  'payments.google.error.parseServiceKey':
    "Error en analitzar l'objecte de clau de servei de l'API de Google:",
}
