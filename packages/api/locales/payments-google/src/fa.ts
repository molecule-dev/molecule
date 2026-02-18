import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for Persian. */
export const fa: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    'نام بسته Google Play موجود نیست (process.env.GOOGLE_PLAY_PACKAGE_NAME).',
  'payments.google.warn.missingServiceKey':
    'شی کلید سرویس Google API موجود نیست (process.env.GOOGLE_API_SERVICE_KEY_OBJECT).',
  'payments.google.error.serviceKeyNotConfigured': 'شی کلید سرویس Google API پیکربندی نشده است',
  'payments.google.error.parseServiceKey': 'خطا در تجزیه شی کلید سرویس Google API:',
}
