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
  'billing.status.currentPlan': 'Nuvarande plan:<x> {{tierName}}</x>',
  'billing.status.cancelError': 'Kunde inte avbryta. Försök igen.',
  'billing.pricing.reassurance': 'Avbryt när som helst · Inget kreditkort krävs för att starta',
  'billing.pricing.perSeat': 'per säte',
}
