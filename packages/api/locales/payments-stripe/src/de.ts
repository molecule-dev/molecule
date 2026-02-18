import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for German. */
export const de: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': 'Fehlendes Stripe Webhook-Geheimnis',
  'payments.stripe.warn.missingSecretKey':
    'Fehlender Stripe geheimer Schlüssel (process.env.STRIPE_SECRET_KEY).',
}
