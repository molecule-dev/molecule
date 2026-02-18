import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for Burmese. */
export const my: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': 'Stripe webhook လျှို့ဝှက်ချက် ပျောက်ဆုံးနေသည်',
  'payments.stripe.warn.missingSecretKey':
    'Stripe လျှို့ဝှက် သော့ ပျောက်ဆုံးနေသည် (process.env.STRIPE_SECRET_KEY)။',
}
