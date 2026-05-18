import type { BillingTranslations } from './types.js'

/** Billing translations for hr. */
export const hr: Partial<BillingTranslations> = {
  'billing.status.loading': 'Učitavanje…',
  'billing.status.currentPlan': 'Trenutni plan:<x> {{tierName}}</x>',
  'billing.status.cancelCta': 'Otkaži pretplatu',
  'billing.status.cancelError': 'Nije moguće otkazati. Pokušajte ponovno.',
  'billing.pricing.loading': 'Učitavanje planova…',
  'billing.pricing.error': 'Nije moguće učitati cijene. Pokušajte ponovno kasnije.',
  'billing.pricing.checkoutError': 'Nije moguće pokrenuti naplatu. Pokušajte ponovno.',
  'billing.pricing.reassurance': 'Otkažite bilo kada · Za početak nije potrebna kreditna kartica',
  'billing.pricing.mostPopular': 'Najpopularnije',
  'billing.pricing.tierEyebrow': 'Razina',
  'billing.pricing.perSeat': 'po sjedalu',
  'billing.pricing.upgradeCta': 'Nadogradi na<x> {{tierName}}</x>',
}
