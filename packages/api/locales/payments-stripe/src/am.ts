import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for Amharic. */
export const am: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': 'Stripe webhook ምስጢር የለም',
  'payments.stripe.warn.missingSecretKey': 'Stripe ምስጢር ቁልፍ የለም (process.env.STRIPE_SECRET_KEY)።',
}
