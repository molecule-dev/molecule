import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for Latvian. */
export const lv: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    'Trūkst Google Play paketes nosaukuma (process.env.GOOGLE_PLAY_PACKAGE_NAME).',
  'payments.google.warn.missingServiceKey':
    'Trūkst Google API pakalpojuma atslēgas objekta (process.env.GOOGLE_API_SERVICE_KEY_OBJECT).',
  'payments.google.error.serviceKeyNotConfigured':
    'Google API pakalpojuma atslēgas objekts nav konfigurēts',
  'payments.google.error.parseServiceKey':
    'Kļūda, parsējot Google API pakalpojuma atslēgas objektu:',
}
