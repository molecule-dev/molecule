import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for Gujarati. */
export const gu: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': 'Stripe webhook ગુપ્ત ખૂટે છે',
  'payments.stripe.warn.missingSecretKey':
    'Stripe ગુપ્ત કી ખૂટે છે (process.env.STRIPE_SECRET_KEY).',
}
