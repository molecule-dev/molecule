import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for Georgian. */
export const ka: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    'Google Play პაკეტის სახელი არ არის (process.env.GOOGLE_PLAY_PACKAGE_NAME).',
  'payments.google.warn.missingServiceKey':
    'Google API სერვისის გასაღების ობიექტი არ არის (process.env.GOOGLE_API_SERVICE_KEY_OBJECT).',
  'payments.google.error.serviceKeyNotConfigured':
    'Google API სერვისის გასაღების ობიექტი არ არის კონფიგურირებული',
  'payments.google.error.parseServiceKey':
    'Google API სერვისის გასაღების ობიექტის გარჩევის შეცდომა:',
}
