import type { PricingPageTranslations } from './types.js'

/** PricingPage translations for fi. */
export const fi: Partial<PricingPageTranslations> = {
  'pricingPage.loading': 'Ladataan tilauksia…',
  'pricingPage.error': 'Hinnoittelua ei voitu ladata. Yritä myöhemmin uudelleen.',
  'pricingPage.checkoutError': 'Kassaa ei voitu käynnistää. Yritä uudelleen.',
  'pricingPage.upgradeCta': 'Päivitä: {{tierName}}',
  'pricingPage.currentCta': 'Nykyinen suunnitelma',
  'pricingPage.periodToggle.monthly': 'Kuukausittain',
  'pricingPage.periodToggle.yearly': 'Vuosittain',
  'pricingPage.heading': 'Valitse sopimuksesi',
  'pricingPage.perSeat': 'istuinta kohden',
  'pricingPage.periodToggle.label': 'Laskutuskausi',
  'pricingPage.planUpdated.heading': 'Suunnitelmasi on päivitetty',
  'pricingPage.planUpdated.body':
    'Kiitos päivityksestä. Uusi sopimuksesi on heti aktiivinen ja kuitti on lähetetty sinulle sähköpostitse.',
  'pricingPage.planUpdated.headingNamed':
    'Olet nyt paikalla<x> {{suunnitelmanNimi}}</x> suunnitelma',
}
