import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for Gujarati. */
export const gu: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    'Google Play પેકેજ નામ ખૂટે છે (process.env.GOOGLE_PLAY_PACKAGE_NAME).',
  'payments.google.warn.missingServiceKey':
    'Google API સેવા કી ઑબ્જેક્ટ ખૂટે છે (process.env.GOOGLE_API_SERVICE_KEY_OBJECT).',
  'payments.google.error.serviceKeyNotConfigured': 'Google API સેવા કી ઑબ્જેક્ટ ગોઠવેલ નથી',
  'payments.google.error.parseServiceKey': 'Google API સેવા કી ઑબ્જેક્ટ પાર્સ કરવામાં ભૂલ:',
}
