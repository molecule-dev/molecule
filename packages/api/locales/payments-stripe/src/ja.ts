import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for Japanese. */
export const ja: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': 'Stripe webhookシークレットがありません',
  'payments.stripe.warn.missingSecretKey':
    'Stripeシークレットキーがありません (process.env.STRIPE_SECRET_KEY)。',
}
