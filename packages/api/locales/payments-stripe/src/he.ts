import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for Hebrew. */
export const he: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': 'חסר סוד webhook של Stripe',
  'payments.stripe.warn.missingSecretKey':
    'חסר מפתח סודי של Stripe (process.env.STRIPE_SECRET_KEY).',
}
