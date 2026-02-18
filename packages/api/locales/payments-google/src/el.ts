import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for Greek. */
export const el: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    'Λείπει το όνομα πακέτου Google Play (process.env.GOOGLE_PLAY_PACKAGE_NAME).',
  'payments.google.warn.missingServiceKey':
    'Λείπει το αντικείμενο κλειδιού υπηρεσίας Google API (process.env.GOOGLE_API_SERVICE_KEY_OBJECT).',
  'payments.google.error.serviceKeyNotConfigured':
    'Το αντικείμενο κλειδιού υπηρεσίας Google API δεν έχει ρυθμιστεί',
  'payments.google.error.parseServiceKey':
    'Σφάλμα ανάλυσης αντικειμένου κλειδιού υπηρεσίας Google API:',
}
