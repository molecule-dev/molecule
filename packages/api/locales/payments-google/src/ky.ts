import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for Kyrgyz. */
export const ky: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    'Google Play пакет аты жок (process.env.GOOGLE_PLAY_PACKAGE_NAME).',
  'payments.google.warn.missingServiceKey':
    'Google API кызмат ачкыч объектиси жок (process.env.GOOGLE_API_SERVICE_KEY_OBJECT).',
  'payments.google.error.serviceKeyNotConfigured':
    'Google API кызмат ачкыч объектиси конфигурацияланган эмес',
  'payments.google.error.parseServiceKey': 'Google API кызмат ачкыч объектисин талдоо катасы:',
}
