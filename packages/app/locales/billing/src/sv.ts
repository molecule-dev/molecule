import type { BillingTranslations } from './types.js'

/** Billing translations for sv. */
export const sv: Partial<BillingTranslations> = {
  'billing.status.loading': 'Laddar…',
  'billing.status.cancelCta': 'Avsluta prenumeration',
  'billing.pricing.loading': 'Laddar planer…',
  'billing.pricing.error': 'Kunde inte ladda prissättning. Försök igen senare.',
  'billing.pricing.checkoutError': 'Kunde inte starta checkout. Försök igen.',
  'billing.pricing.mostPopular': 'Mest populär',
  'billing.pricing.tierEyebrow': 'Nivå',
  'billing.pricing.upgradeCta': 'Uppgradera till {{tierName}}',
  'billing.status.currentPlan': 'Nuvarande plan: {{tierName}}',
  'billing.status.cancelError': 'Kunde inte avbryta. Försök igen.',
  'billing.pricing.reassurance': 'Avbryt när som helst · Inget kreditkort krävs för att starta',
  'billing.pricing.perSeat': 'per säte',
  'billing.pricing.currentCta': 'Nuvarande plan',
  'billing.pricing.period.month': 'per månad',
  'billing.pricing.period.year': 'per år',
  'billing.pricing.billed.month': 'Faktureras månadsvis',
  'billing.pricing.billed.year': 'Faktureras årligen',
  'billing.pricing.unlimited': 'Obegränsat',
  'billing.pricing.limit.maxProjects': 'Max. antal projekt',
  'billing.pricing.limit.canExport': 'Export möjlig',
}
