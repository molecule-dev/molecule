/** Translation keys for the billing-react locale package. */
export type BillingTranslationKey =
  | 'billing.status.loading'
  | 'billing.status.currentPlan'
  | 'billing.status.cancelCta'
  | 'billing.status.cancelError'
  | 'billing.pricing.loading'
  | 'billing.pricing.error'
  | 'billing.pricing.checkoutError'
  | 'billing.pricing.reassurance'
  | 'billing.pricing.mostPopular'
  | 'billing.pricing.tierEyebrow'
  | 'billing.pricing.perSeat'
  | 'billing.pricing.upgradeCta'

/** Translation record mapping billing-react keys to translated strings. */
export type BillingTranslations = Record<BillingTranslationKey, string>
