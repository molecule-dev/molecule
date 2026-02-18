import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for Portuguese. */
export const pt: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': 'Segredo webhook Stripe ausente',
  'payments.stripe.warn.missingSecretKey':
    'Chave secreta Stripe ausente (process.env.STRIPE_SECRET_KEY).',
}
