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
  'billing.status.currentPlan': 'Nykyinen suunnitelma: {{tierName}}',
  'billing.status.cancelError': 'Peruutus epäonnistui. Yritä uudelleen.',
  'billing.pricing.reassurance': 'Peruuta milloin tahansa · Aloittamiseen ei tarvita luottokorttia',
  'billing.pricing.tierEyebrow': 'Taso',
  'billing.pricing.perSeat': 'istuinta kohden',
  'billing.pricing.currentCta': 'Nykyinen suunnitelma',
  'billing.pricing.period.month': 'kuukausittain',
  'billing.pricing.period.year': 'vuosittain',
  'billing.pricing.billed.month': 'Laskutetaan kuukausittain',
  'billing.pricing.billed.year': 'Laskutetaan vuosittain',
  'billing.pricing.unlimited': 'Rajoittamaton',
  'billing.pricing.limit.maxProjects': 'Projektien enimmäismäärä',
  'billing.pricing.limit.canExport': 'Vienti mahdollinen',
}
