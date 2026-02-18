import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for Telugu. */
export const te: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': 'Stripe webhook రహస్యం లేదు',
  'payments.stripe.warn.missingSecretKey': 'Stripe రహస్య కీ లేదు (process.env.STRIPE_SECRET_KEY).',
}
