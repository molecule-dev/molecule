import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for Slovenian. */
export const sl: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': 'Manjka Stripe webhook skrivnost',
  'payments.stripe.warn.missingSecretKey':
    'Manjka Stripe skrivni ključ (process.env.STRIPE_SECRET_KEY).',
}
