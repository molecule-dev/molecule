import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for Afrikaans. */
export const af: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': 'Ontbrekende Stripe webhook geheim',
  'payments.stripe.warn.missingSecretKey':
    'Ontbrekende Stripe geheime sleutel (process.env.STRIPE_SECRET_KEY).',
}
