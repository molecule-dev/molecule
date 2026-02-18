import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for Filipino. */
export const fil: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': 'Nawawalang Stripe webhook secret',
  'payments.stripe.warn.missingSecretKey':
    'Nawawalang Stripe secret key (process.env.STRIPE_SECRET_KEY).',
}
