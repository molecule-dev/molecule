import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for Latvian. */
export const lv: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': 'Trūkst Stripe webhook noslēpums',
  'payments.stripe.warn.missingSecretKey':
    'Trūkst Stripe slepenās atslēgas (process.env.STRIPE_SECRET_KEY).',
}
