import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for English. */
export const en: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    'Missing Google Play package name (process.env.GOOGLE_PLAY_PACKAGE_NAME).',
  'payments.google.warn.missingServiceKey':
    'Missing Google API service key object (process.env.GOOGLE_API_SERVICE_KEY_OBJECT).',
  'payments.google.error.serviceKeyNotConfigured': 'Google API service key object not configured',
  'payments.google.error.parseServiceKey': 'Error parsing Google API service key object:',
}
