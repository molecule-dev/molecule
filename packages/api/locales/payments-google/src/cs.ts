import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for Czech. */
export const cs: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    'Chybí název balíčku Google Play (process.env.GOOGLE_PLAY_PACKAGE_NAME).',
  'payments.google.warn.missingServiceKey':
    'Chybí objekt klíče služby Google API (process.env.GOOGLE_API_SERVICE_KEY_OBJECT).',
  'payments.google.error.serviceKeyNotConfigured':
    'Objekt klíče služby Google API není nakonfigurován',
  'payments.google.error.parseServiceKey': 'Chyba při analýze objektu klíče služby Google API:',
}
