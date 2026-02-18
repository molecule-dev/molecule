import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for Korean. */
export const ko: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': 'Stripe webhook 비밀이 없습니다',
  'payments.stripe.warn.missingSecretKey':
    'Stripe 비밀 키가 없습니다 (process.env.STRIPE_SECRET_KEY).',
}
