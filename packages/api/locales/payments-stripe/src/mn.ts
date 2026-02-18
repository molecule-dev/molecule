import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for Mongolian. */
export const mn: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': 'Stripe webhook нууц байхгүй байна',
  'payments.stripe.warn.missingSecretKey':
    'Stripe нууц түлхүүр байхгүй байна (process.env.STRIPE_SECRET_KEY).',
}
