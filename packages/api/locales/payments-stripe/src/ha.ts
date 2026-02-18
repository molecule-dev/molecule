import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for Hausa. */
export const ha: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': 'Asirin webhook na Stripe ya ɓace',
  'payments.stripe.warn.missingSecretKey':
    'Maɓallin sirri na Stripe ya ɓace (process.env.STRIPE_SECRET_KEY).',
}
