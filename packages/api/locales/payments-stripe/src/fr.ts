import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for French. */
export const fr: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': 'Secret webhook Stripe manquant',
  'payments.stripe.warn.missingSecretKey':
    'Clé secrète Stripe manquante (process.env.STRIPE_SECRET_KEY).',
}
