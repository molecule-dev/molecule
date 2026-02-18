import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for Finnish. */
export const fi: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    'Google Play -paketin nimi puuttuu (process.env.GOOGLE_PLAY_PACKAGE_NAME).',
  'payments.google.warn.missingServiceKey':
    'Google API -palveluavainobjekti puuttuu (process.env.GOOGLE_API_SERVICE_KEY_OBJECT).',
  'payments.google.error.serviceKeyNotConfigured':
    'Google API -palveluavainobjektia ei ole määritetty',
  'payments.google.error.parseServiceKey': 'Virhe Google API -palveluavainobjektin jäsentämisessä:',
}
