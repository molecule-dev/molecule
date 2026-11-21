import type { BillingTranslations } from './types.js'

/** Billing translations for nl. */
export const nl: Partial<BillingTranslations> = {
  'billing.status.loading': 'Laden…',
  'billing.status.cancelCta': 'Abonnement opzeggen',
  'billing.pricing.loading': 'Abonnementen laden…',
  'billing.pricing.error': 'Prijzen konden niet worden geladen. Probeer het later opnieuw.',
  'billing.pricing.checkoutError': 'Kon afrekenen niet starten. Probeer opnieuw.',
  'billing.pricing.mostPopular': 'Meest populair',
  'billing.pricing.tierEyebrow': 'Niveau',
  'billing.pricing.upgradeCta': 'Upgrade naar {{tierName}}',
  'billing.status.currentPlan': 'Huidig plan: {{tierName}}',
  'billing.status.cancelError': 'Annuleren is niet gelukt. Probeer het opnieuw.',
  'billing.pricing.reassurance': 'Annuleer op elk moment · Geen creditcard nodig om te beginnen',
  'billing.pricing.perSeat': 'per stoel',
  'billing.pricing.currentCta': 'Huidig plan',
  'billing.pricing.period.month': 'per maand',
  'billing.pricing.period.year': 'per jaar',
  'billing.pricing.billed.month': 'Maandelijks gefactureerd',
  'billing.pricing.billed.year': 'Jaarlijks gefactureerd',
  'billing.pricing.unlimited': 'Onbeperkt',
  'billing.pricing.limit.maxProjects': 'Max. projecten',
  'billing.pricing.limit.canExport': 'Export mogelijk',
}
