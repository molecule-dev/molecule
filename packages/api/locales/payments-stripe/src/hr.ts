import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for Croatian. */
export const hr: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': 'Nedostaje Stripe webhook tajna',
  'payments.stripe.warn.missingSecretKey':
    'Nedostaje Stripe tajni ključ (process.env.STRIPE_SECRET_KEY).',
}
