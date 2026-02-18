import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for Swedish. */
export const sv: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    'Saknar Google Play-paketnamn (process.env.GOOGLE_PLAY_PACKAGE_NAME).',
  'payments.google.warn.missingServiceKey':
    'Saknar Google API-tjänstenyckelobjekt (process.env.GOOGLE_API_SERVICE_KEY_OBJECT).',
  'payments.google.error.serviceKeyNotConfigured':
    'Google API-tjänstenyckelobjekt inte konfigurerat',
  'payments.google.error.parseServiceKey': 'Fel vid parsning av Google API-tjänstenyckelobjekt:',
}
