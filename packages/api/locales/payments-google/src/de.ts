import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for German. */
export const de: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    'Google Play-Paketname fehlt (process.env.GOOGLE_PLAY_PACKAGE_NAME).',
  'payments.google.warn.missingServiceKey':
    'Google API-Dienstschlüsselobjekt fehlt (process.env.GOOGLE_API_SERVICE_KEY_OBJECT).',
  'payments.google.error.serviceKeyNotConfigured':
    'Google API-Dienstschlüsselobjekt nicht konfiguriert',
  'payments.google.error.parseServiceKey':
    'Fehler beim Parsen des Google API-Dienstschlüsselobjekts:',
}
