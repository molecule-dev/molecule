import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for Tamil. */
export const ta: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': 'Stripe webhook ரகசியம் இல்லை',
  'payments.stripe.warn.missingSecretKey':
    'Stripe ரகசிய விசை இல்லை (process.env.STRIPE_SECRET_KEY).',
}
