import type { PricingPageTranslations } from './types.js'

/** PricingPage translations for fr. */
export const fr: Partial<PricingPageTranslations> = {
  'pricingPage.loading': 'Chargement des plans…',
  'pricingPage.error': 'Impossible de charger les tarifs. Réessayez plus tard.',
  'pricingPage.checkoutError': 'Impossible de démarrer le paiement. Veuillez réessayer.',
  'pricingPage.upgradeCta': 'Passer à {{tierName}}',
  'pricingPage.currentCta': 'Plan actuel',
  'pricingPage.periodToggle.monthly': 'Mensuel',
  'pricingPage.periodToggle.yearly': 'Annuel',
  'pricingPage.planUpdated.heading': 'Votre formule a été mise à jour',
  'pricingPage.heading': 'Choisissez votre forfait',
  'pricingPage.perSeat': 'par siège',
  'pricingPage.periodToggle.label': 'Période de facturation',
  'pricingPage.planUpdated.body':
    'Merci pour votre mise à niveau. Votre nouveau forfait est immédiatement actif et un reçu vous a été envoyé par courriel.',
  'pricingPage.planUpdated.headingNamed': 'Vous êtes maintenant sur le<x> {{planName}}</x> plan',
}
