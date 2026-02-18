/** Translation keys for the payments-google locale package. */
export type PaymentsGoogleTranslationKey =
  | 'payments.google.warn.missingPackageName'
  | 'payments.google.warn.missingServiceKey'
  | 'payments.google.error.serviceKeyNotConfigured'
  | 'payments.google.error.parseServiceKey'

/** Translation record mapping payments-google keys to translated strings. */
export type PaymentsGoogleTranslations = Record<PaymentsGoogleTranslationKey, string>
