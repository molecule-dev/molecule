import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for Hungarian. */
export const hu: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    'Hiányzó Google Play csomagnév (process.env.GOOGLE_PLAY_PACKAGE_NAME).',
  'payments.google.warn.missingServiceKey':
    'Hiányzó Google API szolgáltatáskulcs-objektum (process.env.GOOGLE_API_SERVICE_KEY_OBJECT).',
  'payments.google.error.serviceKeyNotConfigured':
    'Google API szolgáltatáskulcs-objektum nincs konfigurálva',
  'payments.google.error.parseServiceKey':
    'Hiba a Google API szolgáltatáskulcs-objektum elemzésekor:',
}
