import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for Filipino. */
export const fil: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    'Kulang ang pangalan ng Google Play package (process.env.GOOGLE_PLAY_PACKAGE_NAME).',
  'payments.google.warn.missingServiceKey':
    'Kulang ang Google API service key object (process.env.GOOGLE_API_SERVICE_KEY_OBJECT).',
  'payments.google.error.serviceKeyNotConfigured':
    'Hindi na-configure ang Google API service key object',
  'payments.google.error.parseServiceKey': 'Error sa pag-parse ng Google API service key object:',
}
