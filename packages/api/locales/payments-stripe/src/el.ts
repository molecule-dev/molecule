import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for Greek. */
export const el: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': 'Λείπει το μυστικό webhook του Stripe',
  'payments.stripe.warn.missingSecretKey':
    'Λείπει το μυστικό κλειδί Stripe (process.env.STRIPE_SECRET_KEY).',
}
