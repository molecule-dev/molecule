import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for Marathi. */
export const mr: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': 'Stripe webhook गुप्त गहाळ आहे',
  'payments.stripe.warn.missingSecretKey':
    'Stripe गुप्त की गहाळ आहे (process.env.STRIPE_SECRET_KEY).',
}
