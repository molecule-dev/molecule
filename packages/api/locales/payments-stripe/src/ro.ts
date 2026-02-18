import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for Romanian. */
export const ro: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': 'Lipsește secretul webhook Stripe',
  'payments.stripe.warn.missingSecretKey':
    'Lipsește cheia secretă Stripe (process.env.STRIPE_SECRET_KEY).',
}
