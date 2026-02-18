import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for Ukrainian. */
export const uk: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': 'Відсутній секрет webhook Stripe',
  'payments.stripe.warn.missingSecretKey':
    'Відсутній секретний ключ Stripe (process.env.STRIPE_SECRET_KEY).',
}
