import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for Hausa. */
export const ha: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    'Sunan fakitin Google Play ya ɓace (process.env.GOOGLE_PLAY_PACKAGE_NAME).',
  'payments.google.warn.missingServiceKey':
    'Abin maɓallin sabis na Google API ya ɓace (process.env.GOOGLE_API_SERVICE_KEY_OBJECT).',
  'payments.google.error.serviceKeyNotConfigured':
    'Ba a saita abin maɓallin sabis na Google API ba',
  'payments.google.error.parseServiceKey': 'Kuskuren tantance abin maɓallin sabis na Google API:',
}
