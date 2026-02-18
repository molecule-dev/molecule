import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for Marathi. */
export const mr: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    'Google Play पॅकेज नाव गहाळ आहे (process.env.GOOGLE_PLAY_PACKAGE_NAME).',
  'payments.google.warn.missingServiceKey':
    'Google API सेवा की ऑब्जेक्ट गहाळ आहे (process.env.GOOGLE_API_SERVICE_KEY_OBJECT).',
  'payments.google.error.serviceKeyNotConfigured':
    'Google API सेवा की ऑब्जेक्ट कॉन्फिगर केलेले नाही',
  'payments.google.error.parseServiceKey': 'Google API सेवा की ऑब्जेक्ट पार्स करण्यात त्रुटी:',
}
