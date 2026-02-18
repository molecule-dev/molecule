import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for Irish. */
export const ga: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': 'Rún webhook Stripe ar iarraidh',
  'payments.stripe.warn.missingSecretKey':
    'Eochair rúnda Stripe ar iarraidh (process.env.STRIPE_SECRET_KEY).',
}
