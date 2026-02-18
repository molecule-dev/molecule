import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for Igbo. */
export const ig: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    'Aha ngwugwu Google Play na-efu (process.env.GOOGLE_PLAY_PACKAGE_NAME).',
  'payments.google.warn.missingServiceKey':
    'Ihe mkpọchi ọrụ Google API na-efu (process.env.GOOGLE_API_SERVICE_KEY_OBJECT).',
  'payments.google.error.serviceKeyNotConfigured': 'A hazibeghị ihe mkpọchi ọrụ Google API',
  'payments.google.error.parseServiceKey': "Njehie n'ịkọwa ihe mkpọchi ọrụ Google API:",
}
