import type { BillingTranslations } from './types.js'

/** Billing translations for fi. */
export const fi: Partial<BillingTranslations> = {
  'billing.status.loading': 'Ladataan…',
  'billing.status.cancelCta': 'Peruuta tilaus',
  'billing.pricing.loading': 'Ladataan tilauksia…',
  'billing.pricing.error': 'Hinnoittelua ei voitu ladata. Yritä myöhemmin uudelleen.',
  'billing.pricing.checkoutError': 'Kassaa ei voitu käynnistää. Yritä uudelleen.',
  'billing.pricing.mostPopular': 'Suosituin',
  'billing.pricing.upgradeCta': 'Päivitä: {{tierName}}',
  'billing.status.currentPlan': 'Nykyinen suunnitelma:<x> {{tasonNimi}}</x>',
  'billing.status.cancelError': 'Peruutus epäonnistui. Yritä uudelleen.',
  'billing.pricing.reassurance': 'Peruuta milloin tahansa · Aloittamiseen ei tarvita luottokorttia',
  'billing.pricing.tierEyebrow': 'Taso',
  'billing.pricing.perSeat': 'istuinta kohden',
}
