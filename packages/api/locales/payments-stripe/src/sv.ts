import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for Swedish. */
export const sv: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': 'Saknar Stripe webhook hemlighet',
  'payments.stripe.warn.missingSecretKey':
    'Saknar Stripe hemlig nyckel (process.env.STRIPE_SECRET_KEY).',
}
