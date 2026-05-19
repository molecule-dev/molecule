import type { PricingPageTranslations } from './types.js'

/** PricingPage translations for cs. */
export const cs: Partial<PricingPageTranslations> = {
  'pricingPage.loading': 'Načítání plánů…',
  'pricingPage.error': 'Ceny se nepodařilo načíst. Zkuste to znovu později.',
  'pricingPage.checkoutError': 'Nepodařilo se spustit pokladnu. Zkuste to prosím znovu.',
  'pricingPage.upgradeCta': 'Přejít na {{tierName}}',
  'pricingPage.currentCta': 'Aktuální plán',
  'pricingPage.periodToggle.monthly': 'Měsíčně',
  'pricingPage.periodToggle.yearly': 'Ročně',
  'pricingPage.heading': 'Vyberte si svůj tarif',
  'pricingPage.perSeat': 'na sedadlo',
  'pricingPage.periodToggle.label': 'Fakturační období',
  'pricingPage.planUpdated.heading': 'Váš tarif byl aktualizován',
  'pricingPage.planUpdated.body':
    'Děkujeme za upgrade. Váš nový tarif je okamžitě aktivní a potvrzení vám bylo zasláno e-mailem.',
  'pricingPage.planUpdated.headingNamed': 'Nyní jste na<x> {{název plánu}}</x> plán',
}
