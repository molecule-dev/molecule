/** Translation keys for the user-payments locale package. */
export type UserPaymentTranslationKey =
  | 'user.payment.providerRequired'
  | 'user.payment.subscriptionIdRequired'
  | 'user.payment.receiptAndPlanRequired'
  | 'user.payment.verificationNotConfigured'
  | 'user.payment.invalidPlan'
  | 'user.payment.verificationFailed'
  | 'user.payment.unknownPlan'
  | 'user.payment.invalidWebhookEvent'

/** Translation record mapping user-payments keys to translated strings. */
export type UserPaymentTranslations = Record<UserPaymentTranslationKey, string>
