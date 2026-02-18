import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for Urdu. */
export const ur: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    'Google Play پیکیج کا نام غائب ہے (process.env.GOOGLE_PLAY_PACKAGE_NAME)۔',
  'payments.google.warn.missingServiceKey':
    'Google API سروس کلیدی آبجیکٹ غائب ہے (process.env.GOOGLE_API_SERVICE_KEY_OBJECT)۔',
  'payments.google.error.serviceKeyNotConfigured':
    'Google API سروس کلیدی آبجیکٹ ترتیب نہیں دیا گیا',
  'payments.google.error.parseServiceKey': 'Google API سروس کلیدی آبجیکٹ کو پارس کرنے میں خرابی:',
}
