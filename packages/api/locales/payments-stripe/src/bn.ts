import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for Bengali. */
export const bn: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': 'Stripe webhook গোপন অনুপস্থিত',
  'payments.stripe.warn.missingSecretKey':
    'Stripe গোপন কী অনুপস্থিত (process.env.STRIPE_SECRET_KEY)।',
}
