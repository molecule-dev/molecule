import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for Kazakh. */
export const kk: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    'Google Play пакет атауы жоқ (process.env.GOOGLE_PLAY_PACKAGE_NAME).',
  'payments.google.warn.missingServiceKey':
    'Google API қызмет кілті нысаны жоқ (process.env.GOOGLE_API_SERVICE_KEY_OBJECT).',
  'payments.google.error.serviceKeyNotConfigured':
    'Google API қызмет кілті нысаны конфигурацияланбаған',
  'payments.google.error.parseServiceKey': 'Google API қызмет кілті нысанын талдау қатесі:',
}
