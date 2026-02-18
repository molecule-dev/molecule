import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for Catalan. */
export const ca: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': 'Falta el secret del webhook de Stripe',
  'payments.stripe.warn.missingSecretKey':
    'Falta la clau secreta de Stripe (process.env.STRIPE_SECRET_KEY).',
}
