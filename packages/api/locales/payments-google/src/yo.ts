import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for Yoruba. */
export const yo: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    'Orukọ idii Google Play ti sọnu (process.env.GOOGLE_PLAY_PACKAGE_NAME).',
  'payments.google.warn.missingServiceKey':
    'Nkan bọtini iṣẹ Google API ti sọnu (process.env.GOOGLE_API_SERVICE_KEY_OBJECT).',
  'payments.google.error.serviceKeyNotConfigured': 'A ko ṣètò nkan bọtini iṣẹ Google API',
  'payments.google.error.parseServiceKey': 'Aṣìṣe ninu ṣiṣe nkan bọtini iṣẹ Google API:',
}
