import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for Serbian. */
export const sr: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    'Nedostaje naziv Google Play paketa (process.env.GOOGLE_PLAY_PACKAGE_NAME).',
  'payments.google.warn.missingServiceKey':
    'Nedostaje objekat ključa Google API usluge (process.env.GOOGLE_API_SERVICE_KEY_OBJECT).',
  'payments.google.error.serviceKeyNotConfigured':
    'Objekat ključa Google API usluge nije konfigurisan',
  'payments.google.error.parseServiceKey':
    'Greška pri raščlanjivanju objekta ključa Google API usluge:',
}
