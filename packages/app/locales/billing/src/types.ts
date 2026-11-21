/** Translation keys for the billing locale package. */
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
  | 'billing.pricing.period.month'
  | 'billing.pricing.period.year'
  | 'billing.pricing.billed.month'
  | 'billing.pricing.billed.year'
  | 'billing.pricing.upgradeCta'
  | 'billing.pricing.currentCta'
  | 'billing.pricing.unlimited'
  | 'billing.pricing.limit.maxProjects'
  | 'billing.pricing.limit.canExport'

/** Translation record mapping billing-react keys to translated strings. */
export type BillingTranslations = Record<BillingTranslationKey, string>
