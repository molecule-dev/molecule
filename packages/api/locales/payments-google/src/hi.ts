import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for Hindi. */
export const hi: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    'Google Play पैकेज नाम गायब है (process.env.GOOGLE_PLAY_PACKAGE_NAME)।',
  'payments.google.warn.missingServiceKey':
    'Google API सेवा कुंजी ऑब्जेक्ट गायब है (process.env.GOOGLE_API_SERVICE_KEY_OBJECT)।',
  'payments.google.error.serviceKeyNotConfigured':
    'Google API सेवा कुंजी ऑब्जेक्ट कॉन्फ़िगर नहीं किया गया है',
  'payments.google.error.parseServiceKey': 'Google API सेवा कुंजी ऑब्जेक्ट पार्स करने में त्रुटि:',
}
