import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for Amharic. */
export const am: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    'የGoogle Play ፓኬጅ ስም የለም (process.env.GOOGLE_PLAY_PACKAGE_NAME)።',
  'payments.google.warn.missingServiceKey':
    'የGoogle API አገልግሎት ቁልፍ ዕቃ የለም (process.env.GOOGLE_API_SERVICE_KEY_OBJECT)።',
  'payments.google.error.serviceKeyNotConfigured': 'የGoogle API አገልግሎት ቁልፍ ዕቃ አልተዋቀረም',
  'payments.google.error.parseServiceKey': 'የGoogle API አገልግሎት ቁልፍ ዕቃ መተንተን ስህተት:',
}
