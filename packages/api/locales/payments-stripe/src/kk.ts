import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for Kazakh. */
export const kk: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': 'Stripe webhook құпиясы жоқ',
  'payments.stripe.warn.missingSecretKey':
    'Stripe құпия кілті жоқ (process.env.STRIPE_SECRET_KEY).',
}
