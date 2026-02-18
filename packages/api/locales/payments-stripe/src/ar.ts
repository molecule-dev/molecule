import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for Arabic. */
export const ar: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': 'سر webhook الخاص بـ Stripe مفقود',
  'payments.stripe.warn.missingSecretKey':
    'المفتاح السري لـ Stripe مفقود (process.env.STRIPE_SECRET_KEY).',
}
