import type { BillingTranslations } from './types.js'

/** Billing translations for cs. */
export const cs: Partial<BillingTranslations> = {
  'billing.status.loading': 'Načítání…',
  'billing.status.cancelCta': 'Zrušit předplatné',
  'billing.pricing.loading': 'Načítání plánů…',
  'billing.pricing.error': 'Ceny se nepodařilo načíst. Zkuste to znovu později.',
  'billing.pricing.checkoutError': 'Nepodařilo se spustit pokladnu. Zkuste to prosím znovu.',
  'billing.pricing.mostPopular': 'Nejoblíbenější',
  'billing.pricing.upgradeCta': 'Přejít na {{tierName}}',
  'billing.status.currentPlan': 'Aktuální plán: {{tierName}}',
  'billing.status.cancelError': 'Nepodařilo se zrušit. Zkuste to prosím znovu.',
  'billing.pricing.reassurance': 'Zrušit kdykoli · K zahájení není nutná kreditní karta',
  'billing.pricing.tierEyebrow': 'Úroveň',
  'billing.pricing.perSeat': 'na sedadlo',
  'billing.pricing.currentCta': 'Aktuální plán',
  'billing.pricing.period.month': 'měsíčně',
  'billing.pricing.period.year': 'ročně',
  'billing.pricing.billed.month': 'Účtováno měsíčně',
  'billing.pricing.billed.year': 'Účtováno ročně',
  'billing.pricing.unlimited': 'Neomezeno',
  'billing.pricing.limit.maxProjects': 'Maximální počet projektů',
  'billing.pricing.limit.canExport': 'Export k dispozici',
}
