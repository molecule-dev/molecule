import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for Urdu. */
export const ur: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': 'Stripe webhook خفیہ غائب ہے',
  'payments.stripe.warn.missingSecretKey':
    'Stripe خفیہ کلید غائب ہے (process.env.STRIPE_SECRET_KEY)۔',
}
