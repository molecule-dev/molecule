import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for Bosnian. */
export const bs: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': 'Nedostaje Stripe webhook tajna',
  'payments.stripe.warn.missingSecretKey':
    'Nedostaje Stripe tajni ključ (process.env.STRIPE_SECRET_KEY).',
}
