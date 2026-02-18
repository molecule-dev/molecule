import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for Telugu. */
export const te: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    'Google Play ప్యాకేజీ పేరు లేదు (process.env.GOOGLE_PLAY_PACKAGE_NAME).',
  'payments.google.warn.missingServiceKey':
    'Google API సేవా కీ ఆబ్జెక్ట్ లేదు (process.env.GOOGLE_API_SERVICE_KEY_OBJECT).',
  'payments.google.error.serviceKeyNotConfigured': 'Google API సేవా కీ ఆబ్జెక్ట్ కాన్ఫిగర్ చేయలేదు',
  'payments.google.error.parseServiceKey': 'Google API సేవా కీ ఆబ్జెక్ట్‌ను పార్స్ చేయడంలో లోపం:',
}
