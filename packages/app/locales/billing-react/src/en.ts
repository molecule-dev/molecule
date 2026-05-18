import type { BillingTranslations } from './types.js'

/** Billing translations for English. */
export const en: BillingTranslations = {
  'billing.status.loading': 'Loading…',
  'billing.status.currentPlan': 'Current plan: {{tierName}}',
  'billing.status.cancelCta': 'Cancel subscription',
  'billing.status.cancelError': 'Could not cancel. Please try again.',
  'billing.pricing.loading': 'Loading plans…',
  'billing.pricing.error': 'Could not load pricing. Try again later.',
  'billing.pricing.checkoutError': 'Could not start checkout. Please try again.',
  'billing.pricing.reassurance': 'Cancel anytime · No credit card required to start',
  'billing.pricing.mostPopular': 'Most popular',
  'billing.pricing.tierEyebrow': 'Tier',
  'billing.pricing.perSeat': 'per seat',
  'billing.pricing.upgradeCta': 'Upgrade to {{tierName}}',
}
