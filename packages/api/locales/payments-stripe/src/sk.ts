import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for Slovak. */
export const sk: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': 'Chýba Stripe webhook tajomstvo',
  'payments.stripe.warn.missingSecretKey':
    'Chýba Stripe tajný kľúč (process.env.STRIPE_SECRET_KEY).',
}
