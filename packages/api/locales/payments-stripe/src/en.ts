import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for English. */
export const en: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': 'Missing Stripe webhook secret',
  'payments.stripe.warn.missingSecretKey':
    'Missing Stripe secret key (process.env.STRIPE_SECRET_KEY).',
}
