import type { BillingTranslations } from './types.js'

/** Billing translations for da. */
export const da: Partial<BillingTranslations> = {
  'billing.status.loading': 'Indlæser…',
  'billing.status.cancelCta': 'Annuller abonnement',
  'billing.pricing.loading': 'Indlæser planer…',
  'billing.pricing.error': 'Kunne ikke indlæse priser. Prøv igen senere.',
  'billing.pricing.checkoutError': 'Kunne ikke starte betaling. Prøv venligst igen.',
  'billing.pricing.mostPopular': 'Mest populær',
  'billing.pricing.upgradeCta': 'Opgrader til {{tierName}}',
  'billing.status.currentPlan': 'Nuværende plan: {{tierName}}',
  'billing.status.cancelError': 'Kunne ikke annullere. Prøv igen.',
  'billing.pricing.reassurance': 'Annuller når som helst · Intet kreditkort kræves for at starte',
  'billing.pricing.tierEyebrow': 'Niveau',
  'billing.pricing.perSeat': 'pr. sæde',
  'billing.pricing.currentCta': 'Nuværende plan',
  'billing.pricing.period.month': 'pr. måned',
  'billing.pricing.period.year': 'pr. år',
  'billing.pricing.billed.month': 'Faktureres månedligt',
  'billing.pricing.billed.year': 'Faktureres årligt',
  'billing.pricing.unlimited': 'Ubegrænset',
  'billing.pricing.limit.maxProjects': 'Maks. antal projekter',
  'billing.pricing.limit.canExport': 'Eksport mulig',
}
