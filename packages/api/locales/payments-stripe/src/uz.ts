import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for Uzbek. */
export const uz: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': "Stripe webhook siri yo'q",
  'payments.stripe.warn.missingSecretKey':
    "Stripe maxfiy kalit yo'q (process.env.STRIPE_SECRET_KEY).",
}
