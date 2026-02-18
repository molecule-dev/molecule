import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for French. */
export const fr: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    'Nom du package Google Play manquant (process.env.GOOGLE_PLAY_PACKAGE_NAME).',
  'payments.google.warn.missingServiceKey':
    "Objet de clé de service de l'API Google manquant (process.env.GOOGLE_API_SERVICE_KEY_OBJECT).",
  'payments.google.error.serviceKeyNotConfigured':
    "Objet de clé de service de l'API Google non configuré",
  'payments.google.error.parseServiceKey':
    "Erreur lors de l'analyse de l'objet de clé de service de l'API Google :",
}
