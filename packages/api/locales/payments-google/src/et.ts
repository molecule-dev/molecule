import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for Estonian. */
export const et: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    'Google Play paketi nimi puudub (process.env.GOOGLE_PLAY_PACKAGE_NAME).',
  'payments.google.warn.missingServiceKey':
    'Google API teenuse võtme objekt puudub (process.env.GOOGLE_API_SERVICE_KEY_OBJECT).',
  'payments.google.error.serviceKeyNotConfigured':
    'Google API teenuse võtme objekt pole konfigureeritud',
  'payments.google.error.parseServiceKey': 'Google API teenuse võtme objekti sõelumise viga:',
}
