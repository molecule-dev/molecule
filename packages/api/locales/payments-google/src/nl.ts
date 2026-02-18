import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for Dutch. */
export const nl: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    'Ontbrekende Google Play pakketnaam (process.env.GOOGLE_PLAY_PACKAGE_NAME).',
  'payments.google.warn.missingServiceKey':
    'Ontbrekend Google API-servicesleutelobject (process.env.GOOGLE_API_SERVICE_KEY_OBJECT).',
  'payments.google.error.serviceKeyNotConfigured':
    'Google API-servicesleutelobject niet geconfigureerd',
  'payments.google.error.parseServiceKey':
    'Fout bij het parseren van Google API-servicesleutelobject:',
}
