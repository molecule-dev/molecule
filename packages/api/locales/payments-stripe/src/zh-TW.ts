import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for Chinese (Traditional). */
export const zhTW: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': '缺少 Stripe webhook 金鑰',
  'payments.stripe.warn.missingSecretKey': '缺少 Stripe 密鑰 (process.env.STRIPE_SECRET_KEY)。',
}
