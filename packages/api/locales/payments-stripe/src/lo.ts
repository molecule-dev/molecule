import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for Lao. */
export const lo: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': 'ຂາດລະຫັດລັບ webhook Stripe',
  'payments.stripe.warn.missingSecretKey': 'ຂາດກະແຈລັບ Stripe (process.env.STRIPE_SECRET_KEY).',
}
