import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for Russian. */
export const ru: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': 'Отсутствует секрет webhook Stripe',
  'payments.stripe.warn.missingSecretKey':
    'Отсутствует секретный ключ Stripe (process.env.STRIPE_SECRET_KEY).',
}
