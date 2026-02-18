import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for Nepali. */
export const ne: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    'Google Play प्याकेज नाम छैन (process.env.GOOGLE_PLAY_PACKAGE_NAME)।',
  'payments.google.warn.missingServiceKey':
    'Google API सेवा कुञ्जी वस्तु छैन (process.env.GOOGLE_API_SERVICE_KEY_OBJECT)।',
  'payments.google.error.serviceKeyNotConfigured':
    'Google API सेवा कुञ्जी वस्तु कन्फिगर गरिएको छैन',
  'payments.google.error.parseServiceKey': 'Google API सेवा कुञ्जी वस्तु पार्स गर्दा त्रुटि:',
}
