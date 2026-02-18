import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for Nepali. */
export const ne: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': 'Stripe webhook गोप्य हराइरहेको',
  'payments.stripe.warn.missingSecretKey':
    'Stripe गोप्य कुञ्जी हराइरहेको (process.env.STRIPE_SECRET_KEY)।',
}
