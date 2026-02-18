import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for Finnish. */
export const fi: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': 'Stripe webhook -salaisuus puuttuu',
  'payments.stripe.warn.missingSecretKey':
    'Stripe salainen avain puuttuu (process.env.STRIPE_SECRET_KEY).',
}
