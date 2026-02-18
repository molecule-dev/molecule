import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for Slovenian. */
export const sl: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    'Manjka ime paketa Google Play (process.env.GOOGLE_PLAY_PACKAGE_NAME).',
  'payments.google.warn.missingServiceKey':
    'Manjka objekt ključa storitve Google API (process.env.GOOGLE_API_SERVICE_KEY_OBJECT).',
  'payments.google.error.serviceKeyNotConfigured':
    'Objekt ključa storitve Google API ni konfiguriran',
  'payments.google.error.parseServiceKey':
    'Napaka pri razčlenjevanju objekta ključa storitve Google API:',
}
