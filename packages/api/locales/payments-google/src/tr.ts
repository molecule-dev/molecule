import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for Turkish. */
export const tr: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    'Google Play paket adı eksik (process.env.GOOGLE_PLAY_PACKAGE_NAME).',
  'payments.google.warn.missingServiceKey':
    'Google API hizmet anahtarı nesnesi eksik (process.env.GOOGLE_API_SERVICE_KEY_OBJECT).',
  'payments.google.error.serviceKeyNotConfigured':
    'Google API hizmet anahtarı nesnesi yapılandırılmamış',
  'payments.google.error.parseServiceKey': 'Google API hizmet anahtarı nesnesi ayrıştırma hatası:',
}
