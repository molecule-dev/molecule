import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for Tamil. */
export const ta: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    'Google Play தொகுப்பு பெயர் இல்லை (process.env.GOOGLE_PLAY_PACKAGE_NAME).',
  'payments.google.warn.missingServiceKey':
    'Google API சேவை விசை பொருள் இல்லை (process.env.GOOGLE_API_SERVICE_KEY_OBJECT).',
  'payments.google.error.serviceKeyNotConfigured':
    'Google API சேவை விசை பொருள் கட்டமைக்கப்படவில்லை',
  'payments.google.error.parseServiceKey': 'Google API சேவை விசை பொருளை பாகுபடுத்துவதில் பிழை:',
}
