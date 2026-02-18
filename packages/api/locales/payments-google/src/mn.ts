import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for Mongolian. */
export const mn: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    'Google Play багцын нэр дутуу байна (process.env.GOOGLE_PLAY_PACKAGE_NAME).',
  'payments.google.warn.missingServiceKey':
    'Google API үйлчилгээний түлхүүр объект дутуу байна (process.env.GOOGLE_API_SERVICE_KEY_OBJECT).',
  'payments.google.error.serviceKeyNotConfigured':
    'Google API үйлчилгээний түлхүүр объект тохируулаагүй байна',
  'payments.google.error.parseServiceKey': 'Google API үйлчилгээний түлхүүр объектыг задлах алдаа:',
}
