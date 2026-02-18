import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for Norwegian Bokmål. */
export const nb: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': 'Manglende Stripe webhook hemmelighet',
  'payments.stripe.warn.missingSecretKey':
    'Manglende Stripe hemmelig nøkkel (process.env.STRIPE_SECRET_KEY).',
}
