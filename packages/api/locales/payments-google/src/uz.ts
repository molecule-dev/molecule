import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for Uzbek. */
export const uz: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    "Google Play paket nomi yo'q (process.env.GOOGLE_PLAY_PACKAGE_NAME).",
  'payments.google.warn.missingServiceKey':
    "Google API xizmat kaliti obyekti yo'q (process.env.GOOGLE_API_SERVICE_KEY_OBJECT).",
  'payments.google.error.serviceKeyNotConfigured': 'Google API xizmat kaliti obyekti sozlanmagan',
  'payments.google.error.parseServiceKey':
    'Google API xizmat kaliti obyektini tahlil qilish xatosi:',
}
