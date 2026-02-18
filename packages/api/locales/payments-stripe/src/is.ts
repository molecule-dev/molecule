import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for Icelandic. */
export const is: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': 'Vantar Stripe webhook leyndarmál',
  'payments.stripe.warn.missingSecretKey':
    'Vantar Stripe leynilykil (process.env.STRIPE_SECRET_KEY).',
}
