import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for Slovak. */
export const sk: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    'Chýba názov balíka Google Play (process.env.GOOGLE_PLAY_PACKAGE_NAME).',
  'payments.google.warn.missingServiceKey':
    'Chýba objekt kľúča služby Google API (process.env.GOOGLE_API_SERVICE_KEY_OBJECT).',
  'payments.google.error.serviceKeyNotConfigured':
    'Objekt kľúča služby Google API nie je nakonfigurovaný',
  'payments.google.error.parseServiceKey': 'Chyba pri analýze objektu kľúča služby Google API:',
}
