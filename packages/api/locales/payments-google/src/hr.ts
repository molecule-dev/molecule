import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for Croatian. */
export const hr: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    'Nedostaje naziv Google Play paketa (process.env.GOOGLE_PLAY_PACKAGE_NAME).',
  'payments.google.warn.missingServiceKey':
    'Nedostaje objekt ključa usluge Google API (process.env.GOOGLE_API_SERVICE_KEY_OBJECT).',
  'payments.google.error.serviceKeyNotConfigured':
    'Objekt ključa usluge Google API nije konfiguriran',
  'payments.google.error.parseServiceKey':
    'Greška pri raščlanjivanju objekta ključa usluge Google API:',
}
