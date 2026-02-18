import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for Italian. */
export const it: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    'Nome del pacchetto Google Play mancante (process.env.GOOGLE_PLAY_PACKAGE_NAME).',
  'payments.google.warn.missingServiceKey':
    'Oggetto chiave di servizio Google API mancante (process.env.GOOGLE_API_SERVICE_KEY_OBJECT).',
  'payments.google.error.serviceKeyNotConfigured':
    'Oggetto chiave di servizio Google API non configurato',
  'payments.google.error.parseServiceKey':
    "Errore durante l'analisi dell'oggetto chiave di servizio Google API:",
}
