import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for Hebrew. */
export const he: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    'חסר שם חבילת Google Play (process.env.GOOGLE_PLAY_PACKAGE_NAME).',
  'payments.google.warn.missingServiceKey':
    'חסר אובייקט מפתח שירות של Google API (process.env.GOOGLE_API_SERVICE_KEY_OBJECT).',
  'payments.google.error.serviceKeyNotConfigured': 'אובייקט מפתח שירות של Google API לא מוגדר',
  'payments.google.error.parseServiceKey': 'שגיאה בניתוח אובייקט מפתח שירות של Google API:',
}
