/** Translation keys for the pricing-page-react locale package. */
export type PricingPageTranslationKey =
  | 'pricingPage.heading'
  | 'pricingPage.loading'
  | 'pricingPage.error'
  | 'pricingPage.checkoutError'
  | 'pricingPage.perSeat'
  | 'pricingPage.upgradeCta'
  | 'pricingPage.currentCta'
  | 'pricingPage.periodToggle.label'
  | 'pricingPage.periodToggle.monthly'
  | 'pricingPage.periodToggle.yearly'
  | 'pricingPage.planUpdated.heading'
  | 'pricingPage.planUpdated.headingNamed'
  | 'pricingPage.planUpdated.body'

/** Translation record mapping pricing-page keys to translated strings. */
export type PricingPageTranslations = Record<PricingPageTranslationKey, string>
