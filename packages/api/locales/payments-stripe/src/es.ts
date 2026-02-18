import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for Spanish. */
export const es: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': 'Falta el secreto del webhook de Stripe',
  'payments.stripe.warn.missingSecretKey':
    'Falta la clave secreta de Stripe (process.env.STRIPE_SECRET_KEY).',
}
