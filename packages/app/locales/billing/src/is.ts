import type { BillingTranslations } from './types.js'

/** Billing translations for is. */
export const is: Partial<BillingTranslations> = {
  'billing.status.loading': 'Hleður…',
  'billing.status.currentPlan': 'Núverandi áætlun: {{tierName}}',
  'billing.status.cancelCta': 'Hætta áskrift',
  'billing.status.cancelError': 'Ekki tókst að hætta við. Reyndu aftur.',
  'billing.pricing.loading': 'Hleður áætlanir…',
  'billing.pricing.error': 'Ekki tókst að hlaða verðlagningu. Reyndu aftur síðar.',
  'billing.pricing.checkoutError': 'Gat ekki hafið greiðslu. Vinsamlegast reyndu aftur.',
  'billing.pricing.reassurance': 'Hætta við hvenær sem er · Engin kreditkorta þarf til að byrja',
  'billing.pricing.mostPopular': 'Vinsælast',
  'billing.pricing.tierEyebrow': 'Stig',
  'billing.pricing.perSeat': 'á sæti',
  'billing.pricing.upgradeCta': 'Uppfæra í {{tierName}}',
  'billing.pricing.currentCta': 'Núverandi áætlun',
  'billing.pricing.period.month': 'á mánuði',
  'billing.pricing.period.year': 'á ári',
  'billing.pricing.billed.month': 'Mánaðarlegt gjald',
  'billing.pricing.billed.year': 'Árlegt gjald',
  'billing.pricing.unlimited': 'Ótakmarkað',
  'billing.pricing.limit.maxProjects': 'Hámarksfjöldi verkefna',
  'billing.pricing.limit.canExport': 'Útflutningur í boði',
}
