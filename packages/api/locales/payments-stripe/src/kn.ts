import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for Kannada. */
export const kn: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': 'Stripe webhook ರಹಸ್ಯ ಕಾಣೆಯಾಗಿದೆ',
  'payments.stripe.warn.missingSecretKey':
    'Stripe ರಹಸ್ಯ ಕೀ ಕಾಣೆಯಾಗಿದೆ (process.env.STRIPE_SECRET_KEY).',
}
