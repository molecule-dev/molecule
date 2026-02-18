import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for Polish. */
export const pl: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': 'Brak sekretu webhook Stripe',
  'payments.stripe.warn.missingSecretKey':
    'Brak tajnego klucza Stripe (process.env.STRIPE_SECRET_KEY).',
}
