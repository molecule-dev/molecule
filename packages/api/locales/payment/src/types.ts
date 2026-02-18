/** Translation keys for the payment locale package. */
export type PaymentTranslationKey =
  | 'payment.plan.free.title'
  | 'payment.plan.free.description'
  | 'payment.plan.free.shortDescription'
  | 'payment.plan.monthly.title'
  | 'payment.plan.yearly.title'
  | 'payment.plan.premium.description'
  | 'payment.plan.yearly.highlightedDescription'

/** Translation record mapping payment keys to translated strings. */
export type PaymentTranslations = Record<PaymentTranslationKey, string>
