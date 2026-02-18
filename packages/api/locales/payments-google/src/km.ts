import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for Khmer. */
export const km: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    'បាត់ឈ្មោះកញ្ចប់ Google Play (process.env.GOOGLE_PLAY_PACKAGE_NAME)។',
  'payments.google.warn.missingServiceKey':
    'បាត់វត្ថុកូនសោសេវាកម្ម Google API (process.env.GOOGLE_API_SERVICE_KEY_OBJECT)។',
  'payments.google.error.serviceKeyNotConfigured':
    'វត្ថុកូនសោសេវាកម្ម Google API មិនត្រូវបានកំណត់រចនាសម្ព័ន្ធទេ',
  'payments.google.error.parseServiceKey': 'កំហុសក្នុងការវិភាគវត្ថុកូនសោសេវាកម្ម Google API:',
}
