import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for Serbian. */
export const sr: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': 'Недостаје Stripe webhook тајна',
  'payments.stripe.warn.missingSecretKey':
    'Недостаје Stripe тајни кључ (process.env.STRIPE_SECRET_KEY).',
}
