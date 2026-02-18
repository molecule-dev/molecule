import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for Afrikaans. */
export const af: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    'Google Play-pakketnaam ontbreek (process.env.GOOGLE_PLAY_PACKAGE_NAME).',
  'payments.google.warn.missingServiceKey':
    'Google API-dienssleutelobjek ontbreek (process.env.GOOGLE_API_SERVICE_KEY_OBJECT).',
  'payments.google.error.serviceKeyNotConfigured':
    'Google API-dienssleutelobjek nie gekonfigureer nie',
  'payments.google.error.parseServiceKey': 'Fout met ontleding van Google API-dienssleutelobjek:',
}
