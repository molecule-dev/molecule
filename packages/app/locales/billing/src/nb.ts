import type { BillingTranslations } from './types.js'

/** Billing translations for nb. */
export const nb: Partial<BillingTranslations> = {
  'billing.status.loading': 'Laster…',
  'billing.status.cancelCta': 'Avbestill abonnement',
  'billing.pricing.loading': 'Laster planer…',
  'billing.pricing.error': 'Kunne ikke laste priser. Prøv igjen senere.',
  'billing.pricing.checkoutError': 'Kunne ikke starte kassen. Prøv igjen.',
  'billing.pricing.mostPopular': 'Mest populær',
  'billing.pricing.upgradeCta': 'Oppgrader til {{tierName}}',
  'billing.status.currentPlan': 'Nåværende plan:<x> {{tierName}}</x>',
  'billing.status.cancelError': 'Kunne ikke avbryte. Prøv på nytt.',
  'billing.pricing.reassurance': 'Avbryt når som helst · Ingen kredittkort kreves for å starte',
  'billing.pricing.tierEyebrow': 'Nivå',
  'billing.pricing.perSeat': 'per sete',
}
