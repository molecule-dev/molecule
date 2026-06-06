import type { BillingTranslations } from './types.js'

/** Billing translations for fr. */
export const fr: Partial<BillingTranslations> = {
  'billing.status.loading': 'Chargement…',
  'billing.pricing.loading': 'Chargement des plans…',
  'billing.pricing.error': 'Impossible de charger les tarifs. Réessayez plus tard.',
  'billing.pricing.checkoutError': 'Impossible de démarrer le paiement. Veuillez réessayer.',
  'billing.pricing.mostPopular': 'Le plus populaire',
  'billing.pricing.tierEyebrow': 'Niveau',
  'billing.pricing.upgradeCta': 'Passer à {{tierName}}',
  'billing.status.currentPlan': 'Plan actuel :<x> {{tierName}}</x>',
  'billing.status.cancelCta': "Annuler l'abonnement",
  'billing.status.cancelError': 'Annulation impossible. Veuillez réessayer.',
  'billing.pricing.reassurance':
    'Annulation possible à tout moment · Aucune carte de crédit requise pour commencer',
  'billing.pricing.perSeat': 'par siège',
}
