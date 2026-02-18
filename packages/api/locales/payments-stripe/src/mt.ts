import type { PaymentsStripeTranslations } from './types.js'

/** Payments Stripe translations for Maltese. */
export const mt: PaymentsStripeTranslations = {
  'payments.stripe.error.missingWebhookSecret': "Is-sigriet tal-webhook ta' Stripe nieqes",
  'payments.stripe.warn.missingSecretKey':
    "Ic-cavetta sigrieta ta' Stripe nieqsa (process.env.STRIPE_SECRET_KEY).",
}
