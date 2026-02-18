import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for Icelandic. */
export const is: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    'Google Play pakkheiti vantar (process.env.GOOGLE_PLAY_PACKAGE_NAME).',
  'payments.google.warn.missingServiceKey':
    'Google API þjónustulykill hlutur vantar (process.env.GOOGLE_API_SERVICE_KEY_OBJECT).',
  'payments.google.error.serviceKeyNotConfigured': 'Google API þjónustulykill hlutur ekki stilltur',
  'payments.google.error.parseServiceKey': 'Villa við að þátta Google API þjónustulykill hlut:',
}
