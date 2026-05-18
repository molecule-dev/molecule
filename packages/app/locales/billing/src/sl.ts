import type { BillingTranslations } from './types.js'

/** Billing translations for sl. */
export const sl: Partial<BillingTranslations> = {
  'billing.status.loading': 'Nalaganje …',
  'billing.status.currentPlan': 'Trenutni načrt:<x> {{tierName}}</x>',
  'billing.status.cancelCta': 'Prekliči naročnino',
  'billing.status.cancelError': 'Preklic ni bil mogoč. Poskusite znova.',
  'billing.pricing.loading': 'Nalaganje načrtov …',
  'billing.pricing.error': 'Cenika ni bilo mogoče naložiti. Poskusite znova pozneje.',
  'billing.pricing.checkoutError': 'Blagajne ni bilo mogoče začeti. Poskusite znova.',
  'billing.pricing.reassurance': 'Prekličite kadar koli · Za začetek ni potrebna kreditna kartica',
  'billing.pricing.mostPopular': 'Najbolj priljubljeno',
  'billing.pricing.tierEyebrow': 'Stopnja',
  'billing.pricing.perSeat': 'na sedež',
  'billing.pricing.upgradeCta': 'Nadgradi na<x> {{tierName}}</x>',
}
