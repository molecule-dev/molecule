import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for Swahili. */
export const sw: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': 'Siri ya webhook ya Stripe haipo',
  'payments.stripe.warn.missingSecretKey':
    'Ufunguo wa siri wa Stripe haupo (process.env.STRIPE_SECRET_KEY).',
}
