import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for Arabic. */
export const ar: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    'اسم حزمة Google Play مفقود (process.env.GOOGLE_PLAY_PACKAGE_NAME).',
  'payments.google.warn.missingServiceKey':
    'كائن مفتاح خدمة Google API مفقود (process.env.GOOGLE_API_SERVICE_KEY_OBJECT).',
  'payments.google.error.serviceKeyNotConfigured': 'كائن مفتاح خدمة Google API غير مكوّن',
  'payments.google.error.parseServiceKey': 'خطأ في تحليل كائن مفتاح خدمة Google API:',
}
