import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for Persian. */
export const fa: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': 'راز webhook استرایپ موجود نیست',
  'payments.stripe.warn.missingSecretKey':
    'کلید مخفی Stripe موجود نیست (process.env.STRIPE_SECRET_KEY).',
}
