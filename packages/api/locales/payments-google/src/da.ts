import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for Danish. */
export const da: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    'Manglende Google Play pakkenavn (process.env.GOOGLE_PLAY_PACKAGE_NAME).',
  'payments.google.warn.missingServiceKey':
    'Manglende Google API-tjenestenøgleobjekt (process.env.GOOGLE_API_SERVICE_KEY_OBJECT).',
  'payments.google.error.serviceKeyNotConfigured':
    'Google API-tjenestenøgleobjekt ikke konfigureret',
  'payments.google.error.parseServiceKey': 'Fejl ved parsing af Google API-tjenestenøgleobjekt:',
}
