import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for Italian. */
export const it: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': 'Segreto webhook Stripe mancante',
  'payments.stripe.warn.missingSecretKey':
    'Chiave segreta Stripe mancante (process.env.STRIPE_SECRET_KEY).',
}
