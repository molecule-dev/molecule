import type { BillingTranslations } from './types.js'

/** Billing translations for ga. */
export const ga: Partial<BillingTranslations> = {
  'billing.status.loading': 'Ag lódáil…',
  'billing.status.currentPlan': 'Plean reatha:<x> {{AinmLeibhéal}}</x>',
  'billing.status.cancelCta': 'Cealaigh an síntiús',
  'billing.status.cancelError': 'Níorbh fhéidir cealú. Déan iarracht arís.',
  'billing.pricing.loading': 'Ag lódáil pleananna…',
  'billing.pricing.error': 'Níorbh fhéidir an praghsáil a lódáil. Déan iarracht arís ar ball.',
  'billing.pricing.checkoutError': 'Níorbh fhéidir an tseiceáil amach a thosú. Déan iarracht arís.',
  'billing.pricing.reassurance': 'Cealaigh am ar bith · Níl cárta creidmheasa ag teastáil le tosú',
  'billing.pricing.mostPopular': 'Is mó tóir',
  'billing.pricing.tierEyebrow': 'Sraith',
  'billing.pricing.perSeat': 'in aghaidh an tsuíocháin',
  'billing.pricing.upgradeCta': 'Uasghrádaigh go<x> {{AinmLeibhéal}}</x>',
}
