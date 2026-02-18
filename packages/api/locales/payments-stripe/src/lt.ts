import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for Lithuanian. */
export const lt: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': 'Trūksta Stripe webhook paslaptis',
  'payments.stripe.warn.missingSecretKey':
    'Trūksta Stripe slapto rakto (process.env.STRIPE_SECRET_KEY).',
}
