import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for Zulu. */
export const zu: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    'Igama lephakeji ye-Google Play alitholakali (process.env.GOOGLE_PLAY_PACKAGE_NAME).',
  'payments.google.warn.missingServiceKey':
    'Into yokhiye yesevisi ye-Google API ayitholakali (process.env.GOOGLE_API_SERVICE_KEY_OBJECT).',
  'payments.google.error.serviceKeyNotConfigured':
    'Into yokhiye yesevisi ye-Google API ayilungiselelwe',
  'payments.google.error.parseServiceKey':
    'Iphutha ekuhlaziyweni kwento yokhiye yesevisi ye-Google API:',
}
