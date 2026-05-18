import type { BillingTranslations } from './types.js'

/** Billing translations for lt. */
export const lt: Partial<BillingTranslations> = {
  'billing.status.loading': 'Kraunama…',
  'billing.status.currentPlan': 'Dabartinis planas:<x> {{tierName}}</x>',
  'billing.status.cancelCta': 'Atšaukti prenumeratą',
  'billing.status.cancelError': 'Nepavyko atšaukti. Bandykite dar kartą.',
  'billing.pricing.loading': 'Įkeliami planai…',
  'billing.pricing.error': 'Kainodaros įkelti nepavyko. Bandykite dar kartą vėliau.',
  'billing.pricing.checkoutError': 'Nepavyko pradėti atsiskaitymo. Bandykite dar kartą.',
  'billing.pricing.reassurance':
    'Atšaukti bet kuriuo metu · Norint pradėti, kreditinės kortelės nereikia',
  'billing.pricing.mostPopular': 'Populiariausi',
  'billing.pricing.tierEyebrow': 'Pakopa',
  'billing.pricing.perSeat': 'vienai vietai',
  'billing.pricing.upgradeCta': 'Atnaujinti į<x> {{tierName}}</x>',
}
