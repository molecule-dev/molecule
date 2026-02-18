import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for Dutch. */
export const nl: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': 'Ontbrekend Stripe webhook geheim',
  'payments.stripe.warn.missingSecretKey':
    'Ontbrekende Stripe geheime sleutel (process.env.STRIPE_SECRET_KEY).',
}
