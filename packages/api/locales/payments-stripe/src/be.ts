import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for Belarusian. */
export const be: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': 'Адсутнічае сакрэт webhook Stripe',
  'payments.stripe.warn.missingSecretKey':
    'Адсутнічае сакрэтны ключ Stripe (process.env.STRIPE_SECRET_KEY).',
}
