import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for Punjabi. */
export const pa: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': 'Stripe webhook ਗੁਪਤ ਗੁੰਮ ਹੈ',
  'payments.stripe.warn.missingSecretKey':
    'Stripe ਗੁਪਤ ਕੁੰਜੀ ਗੁੰਮ ਹੈ (process.env.STRIPE_SECRET_KEY).',
}
