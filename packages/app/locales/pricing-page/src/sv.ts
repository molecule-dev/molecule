import type { PricingPageTranslations } from './types.js'

/** PricingPage translations for sv. */
export const sv: Partial<PricingPageTranslations> = {
  'pricingPage.loading': 'Laddar planer…',
  'pricingPage.error': 'Kunde inte ladda prissättning. Försök igen senare.',
  'pricingPage.checkoutError': 'Kunde inte starta checkout. Försök igen.',
  'pricingPage.upgradeCta': 'Uppgradera till {{tierName}}',
  'pricingPage.currentCta': 'Aktuell plan',
  'pricingPage.periodToggle.monthly': 'Månadsvis',
  'pricingPage.periodToggle.yearly': 'Årligen',
  'pricingPage.planUpdated.heading': 'Din plan har uppdaterats',
  'pricingPage.heading': 'Välj din plan',
  'pricingPage.perSeat': 'per säte',
  'pricingPage.periodToggle.label': 'Faktureringsperiod',
  'pricingPage.planUpdated.body':
    'Tack för att du uppgraderade. Din nya plan är aktiv omedelbart och ett kvitto har skickats till dig via e-post.',
  'pricingPage.planUpdated.headingNamed': 'Du är nu på<x> {{plannamn}}</x> planera',
}
