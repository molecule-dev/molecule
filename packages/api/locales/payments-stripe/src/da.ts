import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for Danish. */
export const da: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': 'Manglende Stripe webhook hemmelighed',
  'payments.stripe.warn.missingSecretKey':
    'Manglende Stripe hemmelig nøgle (process.env.STRIPE_SECRET_KEY).',
}
