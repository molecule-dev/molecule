import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for Turkish. */
export const tr: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': 'Stripe webhook sırrı eksik',
  'payments.stripe.warn.missingSecretKey':
    'Stripe gizli anahtarı eksik (process.env.STRIPE_SECRET_KEY).',
}
