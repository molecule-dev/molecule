import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for Zulu. */
export const zu: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': 'Imfihlo ye-webhook ye-Stripe ayikho',
  'payments.stripe.warn.missingSecretKey':
    'Ukhiye wemfihlo we-Stripe ukashiwe (process.env.STRIPE_SECRET_KEY).',
}
