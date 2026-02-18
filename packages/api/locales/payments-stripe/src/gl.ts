import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for Galician. */
export const gl: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': 'Falta o segredo do webhook de Stripe',
  'payments.stripe.warn.missingSecretKey':
    'Falta a clave secreta de Stripe (process.env.STRIPE_SECRET_KEY).',
}
