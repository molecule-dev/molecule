import type { BillingTranslations } from './types.js'

/** Billing translations for sw. */
export const sw: Partial<BillingTranslations> = {
  'billing.status.loading': 'Inapakia…',
  'billing.status.currentPlan': 'Mpango wa sasa:<x> {{Jina la tier}}</x>',
  'billing.status.cancelCta': 'Ghairi usajili',
  'billing.status.cancelError': 'Haikuweza kughairi. Tafadhali jaribu tena.',
  'billing.pricing.loading': 'Inapakia mipango…',
  'billing.pricing.error': 'Haikuweza kupakia bei. Jaribu tena baadaye.',
  'billing.pricing.checkoutError': 'Haikuweza kuanza kulipa. Tafadhali jaribu tena.',
  'billing.pricing.reassurance': 'Ghairi wakati wowote · Hakuna kadi ya mkopo inayohitajika kuanza',
  'billing.pricing.mostPopular': 'Maarufu zaidi',
  'billing.pricing.tierEyebrow': 'Ngazi',
  'billing.pricing.perSeat': 'kwa kila kiti',
  'billing.pricing.upgradeCta': 'Boresha hadi<x> {{Jina la tier}}</x>',
}
