import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for Irish. */
export const ga: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    'Ainm pacáiste Google Play ar iarraidh (process.env.GOOGLE_PLAY_PACKAGE_NAME).',
  'payments.google.warn.missingServiceKey':
    'Réad eochair seirbhíse Google API ar iarraidh (process.env.GOOGLE_API_SERVICE_KEY_OBJECT).',
  'payments.google.error.serviceKeyNotConfigured': 'Réad eochair seirbhíse Google API gan chumrú',
  'payments.google.error.parseServiceKey': 'Earráid ag parsáil réad eochair seirbhíse Google API:',
}
