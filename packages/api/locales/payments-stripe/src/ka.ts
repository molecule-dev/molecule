import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for Georgian. */
export const ka: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': 'Stripe webhook საიდუმლო არ არსებობს',
  'payments.stripe.warn.missingSecretKey':
    'Stripe საიდუმლო გასაღები არ არსებობს (process.env.STRIPE_SECRET_KEY).',
}
