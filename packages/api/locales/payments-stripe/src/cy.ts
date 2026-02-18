import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for Welsh. */
export const cy: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': 'Cyfrinach webhook Stripe ar goll',
  'payments.stripe.warn.missingSecretKey':
    'Allwedd gyfrinachol Stripe ar goll (process.env.STRIPE_SECRET_KEY).',
}
