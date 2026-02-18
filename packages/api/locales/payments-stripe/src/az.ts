import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for Azerbaijani. */
export const az: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': 'Stripe webhook sirri yoxdur',
  'payments.stripe.warn.missingSecretKey':
    'Stripe gizli açar yoxdur (process.env.STRIPE_SECRET_KEY).',
}
