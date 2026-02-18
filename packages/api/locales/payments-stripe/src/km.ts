import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for Khmer. */
export const km: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': 'គ្មានកូដសម្ងាត់ webhook Stripe',
  'payments.stripe.warn.missingSecretKey':
    'គ្មានកូនសោសម្ងាត់ Stripe (process.env.STRIPE_SECRET_KEY)។',
}
