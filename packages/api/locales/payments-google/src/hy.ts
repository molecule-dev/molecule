import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for Armenian. */
export const hy: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    'Google Play փաթեթի անունը բացակայում է (process.env.GOOGLE_PLAY_PACKAGE_NAME):',
  'payments.google.warn.missingServiceKey':
    'Google API ծառայության բանալի օբյեկտը բացակայում է (process.env.GOOGLE_API_SERVICE_KEY_OBJECT):',
  'payments.google.error.serviceKeyNotConfigured':
    'Google API ծառայության բանալի օբյեկտը կարգավորված չէ',
  'payments.google.error.parseServiceKey':
    'Google API ծառայության բանալի օբյեկտի վերլուծության սխալ՝',
}
