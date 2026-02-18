import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for Armenian. */
export const hy: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': 'Stripe webhook գաղտնիությունը բացակայում է',
  'payments.stripe.warn.missingSecretKey':
    'Stripe գաղտնի բանալին բացակայում է (process.env.STRIPE_SECRET_KEY)։',
}
