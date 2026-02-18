import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for Basque. */
export const eu: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    'Google Play pakete izena falta da (process.env.GOOGLE_PLAY_PACKAGE_NAME).',
  'payments.google.warn.missingServiceKey':
    'Google API zerbitzu gako objektua falta da (process.env.GOOGLE_API_SERVICE_KEY_OBJECT).',
  'payments.google.error.serviceKeyNotConfigured':
    'Google API zerbitzu gako objektua ez dago konfiguratuta',
  'payments.google.error.parseServiceKey': 'Errorea Google API zerbitzu gako objektua aztertzean:',
}
