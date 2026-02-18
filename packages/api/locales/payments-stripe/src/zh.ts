import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for Chinese. */
export const zh: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': '缺少 Stripe webhook 密钥',
  'payments.stripe.warn.missingSecretKey': '缺少 Stripe 密钥 (process.env.STRIPE_SECRET_KEY)。',
}
