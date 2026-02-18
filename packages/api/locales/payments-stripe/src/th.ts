import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for Thai. */
export const th: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': 'ขาดความลับ webhook ของ Stripe',
  'payments.stripe.warn.missingSecretKey': 'ขาดคีย์ลับของ Stripe (process.env.STRIPE_SECRET_KEY)',
}
