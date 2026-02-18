import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for Hungarian. */
export const hu: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': 'Hiányzik a Stripe webhook titok',
  'payments.stripe.warn.missingSecretKey':
    'Hiányzik a Stripe titkos kulcs (process.env.STRIPE_SECRET_KEY).',
}
