import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for Albanian. */
export const sq: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': 'Mungon sekreti i webhook të Stripe',
  'payments.stripe.warn.missingSecretKey':
    'Mungon çelësi sekret i Stripe (process.env.STRIPE_SECRET_KEY).',
}
