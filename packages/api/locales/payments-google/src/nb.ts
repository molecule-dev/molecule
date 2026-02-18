import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for Norwegian Bokmål. */
export const nb: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    'Mangler Google Play pakkenavn (process.env.GOOGLE_PLAY_PACKAGE_NAME).',
  'payments.google.warn.missingServiceKey':
    'Mangler Google API tjenestenøkkelobjekt (process.env.GOOGLE_API_SERVICE_KEY_OBJECT).',
  'payments.google.error.serviceKeyNotConfigured':
    'Google API tjenestenøkkelobjekt ikke konfigurert',
  'payments.google.error.parseServiceKey': 'Feil ved parsing av Google API tjenestenøkkelobjekt:',
}
