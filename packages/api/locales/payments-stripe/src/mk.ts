import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for Macedonian. */
export const mk: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': 'Недостасува Stripe webhook тајна',
  'payments.stripe.warn.missingSecretKey':
    'Недостасува Stripe таен клуч (process.env.STRIPE_SECRET_KEY).',
}
