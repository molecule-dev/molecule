import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for Bengali. */
export const bn: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    'Google Play প্যাকেজের নাম অনুপস্থিত (process.env.GOOGLE_PLAY_PACKAGE_NAME)।',
  'payments.google.warn.missingServiceKey':
    'Google API পরিষেবা কী অবজেক্ট অনুপস্থিত (process.env.GOOGLE_API_SERVICE_KEY_OBJECT)।',
  'payments.google.error.serviceKeyNotConfigured': 'Google API পরিষেবা কী অবজেক্ট কনফিগার করা নেই',
  'payments.google.error.parseServiceKey': 'Google API পরিষেবা কী অবজেক্ট পার্স করার ত্রুটি:',
}
