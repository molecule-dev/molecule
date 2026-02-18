import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for Hindi. */
export const hi: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': 'Stripe webhook गुप्त गायब है',
  'payments.stripe.warn.missingSecretKey':
    'Stripe गुप्त कुंजी गायब है (process.env.STRIPE_SECRET_KEY)।',
}
