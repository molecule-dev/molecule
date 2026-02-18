import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for Malay. */
export const ms: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    'Nama pakej Google Play tiada (process.env.GOOGLE_PLAY_PACKAGE_NAME).',
  'payments.google.warn.missingServiceKey':
    'Objek kunci perkhidmatan Google API tiada (process.env.GOOGLE_API_SERVICE_KEY_OBJECT).',
  'payments.google.error.serviceKeyNotConfigured':
    'Objek kunci perkhidmatan Google API tidak dikonfigurasi',
  'payments.google.error.parseServiceKey': 'Ralat menghurai objek kunci perkhidmatan Google API:',
}
