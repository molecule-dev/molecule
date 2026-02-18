import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for Romanian. */
export const ro: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    'Lipsește numele pachetului Google Play (process.env.GOOGLE_PLAY_PACKAGE_NAME).',
  'payments.google.warn.missingServiceKey':
    'Lipsește obiectul cheii de serviciu Google API (process.env.GOOGLE_API_SERVICE_KEY_OBJECT).',
  'payments.google.error.serviceKeyNotConfigured':
    'Obiectul cheii de serviciu Google API nu este configurat',
  'payments.google.error.parseServiceKey':
    'Eroare la analizarea obiectului cheii de serviciu Google API:',
}
