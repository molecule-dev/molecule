import type { BillingTranslations } from './types.js'

/** Billing translations for bs. */
export const bs: Partial<BillingTranslations> = {
  'billing.status.loading': 'Učitavanje…',
  'billing.status.currentPlan': 'Trenutni plan:<x> {{tierName}}</x>',
  'billing.status.cancelCta': 'Otkaži pretplatu',
  'billing.status.cancelError': 'Nije moguće otkazati. Pokušajte ponovo.',
  'billing.pricing.loading': 'Učitavanje planova…',
  'billing.pricing.error': 'Nije moguće učitati cijene. Pokušajte ponovo kasnije.',
  'billing.pricing.checkoutError': 'Nije moguće započeti plaćanje. Pokušajte ponovo.',
  'billing.pricing.reassurance': 'Otkažite bilo kada · Za početak nije potrebna kreditna kartica',
  'billing.pricing.mostPopular': 'Najpopularnije',
  'billing.pricing.tierEyebrow': 'Nivo',
  'billing.pricing.perSeat': 'po sjedištu',
  'billing.pricing.upgradeCta': 'Nadogradite na<x> {{tierName}}</x>',
}
