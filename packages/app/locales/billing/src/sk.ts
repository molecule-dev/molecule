import type { BillingTranslations } from './types.js'

/** Billing translations for sk. */
export const sk: Partial<BillingTranslations> = {
  'billing.status.loading': 'Načítava sa…',
  'billing.status.currentPlan': 'Aktuálny plán:<x> {{tierName}}</x>',
  'billing.status.cancelCta': 'Zrušiť predplatné',
  'billing.status.cancelError': 'Nepodarilo sa zrušiť. Skúste to znova.',
  'billing.pricing.loading': 'Načítavajú sa plány…',
  'billing.pricing.error': 'Nepodarilo sa načítať ceny. Skúste to znova neskôr.',
  'billing.pricing.checkoutError': 'Nepodarilo sa spustiť platbu. Skúste to znova.',
  'billing.pricing.reassurance': 'Zrušiť kedykoľvek · Na začatie nie je potrebná kreditná karta',
  'billing.pricing.mostPopular': 'Najobľúbenejšie',
  'billing.pricing.tierEyebrow': 'Úroveň',
  'billing.pricing.perSeat': 'na sedadlo',
  'billing.pricing.upgradeCta': 'Inovovať na<x> {{tierName}}</x>',
}
