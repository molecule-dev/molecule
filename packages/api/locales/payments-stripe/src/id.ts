import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for Indonesian. */
export const id: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': 'Rahasia webhook Stripe hilang',
  'payments.stripe.warn.missingSecretKey':
    'Kunci rahasia Stripe hilang (process.env.STRIPE_SECRET_KEY).',
}
