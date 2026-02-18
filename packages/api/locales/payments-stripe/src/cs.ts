import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for Czech. */
export const cs: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': 'Chybí Stripe webhook tajemství',
  'payments.stripe.warn.missingSecretKey':
    'Chybí Stripe tajný klíč (process.env.STRIPE_SECRET_KEY).',
}
