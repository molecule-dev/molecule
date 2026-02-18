import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for Vietnamese. */
export const vi: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': 'Thiếu bí mật webhook Stripe',
  'payments.stripe.warn.missingSecretKey':
    'Thiếu khóa bí mật Stripe (process.env.STRIPE_SECRET_KEY).',
}
