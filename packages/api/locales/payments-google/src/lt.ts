import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for Lithuanian. */
export const lt: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    'Trūksta Google Play paketo pavadinimo (process.env.GOOGLE_PLAY_PACKAGE_NAME).',
  'payments.google.warn.missingServiceKey':
    'Trūksta Google API paslaugos rakto objekto (process.env.GOOGLE_API_SERVICE_KEY_OBJECT).',
  'payments.google.error.serviceKeyNotConfigured':
    'Google API paslaugos rakto objektas nesukonfigūruotas',
  'payments.google.error.parseServiceKey':
    'Klaida analizuojant Google API paslaugos rakto objektą:',
}
