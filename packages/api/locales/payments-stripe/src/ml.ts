import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for Malayalam. */
export const ml: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': 'Stripe webhook രഹസ്യം കാണുന്നില്ല',
  'payments.stripe.warn.missingSecretKey':
    'Stripe രഹസ്യ കീ കാണുന്നില്ല (process.env.STRIPE_SECRET_KEY).',
}
