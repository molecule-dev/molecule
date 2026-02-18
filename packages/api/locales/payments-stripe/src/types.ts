/** Translation keys for the payments-stripe locale package. */
export type PaymentsStripeTranslationKey =
  | 'payments.stripe.error.missingWebhookSecret'
  | 'payments.stripe.warn.missingSecretKey'

/** Translation record mapping payments-stripe keys to translated strings. */
export type PaymentsStripeTranslations = {
  [key in PaymentsStripeTranslationKey]: string
}
