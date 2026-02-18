import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for Malay. */
export const ms: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': 'Rahsia webhook Stripe hilang',
  'payments.stripe.warn.missingSecretKey':
    'Kunci rahsia Stripe hilang (process.env.STRIPE_SECRET_KEY).',
}
