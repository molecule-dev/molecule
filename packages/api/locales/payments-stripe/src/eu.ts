import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for Basque. */
export const eu: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': 'Stripe webhook sekretua falta da',
  'payments.stripe.warn.missingSecretKey':
    'Stripe gako sekretua falta da (process.env.STRIPE_SECRET_KEY).',
}
