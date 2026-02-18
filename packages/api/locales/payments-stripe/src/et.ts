import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for Estonian. */
export const et: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': 'Puudub Stripe webhook saladus',
  'payments.stripe.warn.missingSecretKey':
    'Puudub Stripe salajane võti (process.env.STRIPE_SECRET_KEY).',
}
