import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for Bulgarian. */
export const bg: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': 'Липсва Stripe webhook тайна',
  'payments.stripe.warn.missingSecretKey':
    'Липсва Stripe таен ключ (process.env.STRIPE_SECRET_KEY).',
}
