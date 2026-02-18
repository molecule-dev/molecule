import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for Albanian. */
export const sq: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    'Mungon emri i paketës Google Play (process.env.GOOGLE_PLAY_PACKAGE_NAME).',
  'payments.google.warn.missingServiceKey':
    'Mungon objekti i çelësit të shërbimit Google API (process.env.GOOGLE_API_SERVICE_KEY_OBJECT).',
  'payments.google.error.serviceKeyNotConfigured':
    'Objekti i çelësit të shërbimit Google API nuk është konfiguruar',
  'payments.google.error.parseServiceKey':
    'Gabim në analizimin e objektit të çelësit të shërbimit Google API:',
}
