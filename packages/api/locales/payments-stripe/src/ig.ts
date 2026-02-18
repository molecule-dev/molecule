import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for Igbo. */
export const ig: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': 'Ihe nzuzo webhook Stripe na-efu',
  'payments.stripe.warn.missingSecretKey':
    'Igodo nzuzo Stripe na-efu (process.env.STRIPE_SECRET_KEY).',
}
