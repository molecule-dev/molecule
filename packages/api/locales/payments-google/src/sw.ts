import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for Swahili. */
export const sw: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    'Jina la kifurushi cha Google Play kinakosekana (process.env.GOOGLE_PLAY_PACKAGE_NAME).',
  'payments.google.warn.missingServiceKey':
    'Kitu cha ufunguo wa huduma ya Google API kinakosekana (process.env.GOOGLE_API_SERVICE_KEY_OBJECT).',
  'payments.google.error.serviceKeyNotConfigured':
    'Kitu cha ufunguo wa huduma ya Google API hakijasanidiwa',
  'payments.google.error.parseServiceKey':
    'Hitilafu katika kuchambua kitu cha ufunguo wa huduma ya Google API:',
}
