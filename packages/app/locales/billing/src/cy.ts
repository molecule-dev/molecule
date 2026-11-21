import type { BillingTranslations } from './types.js'

/** Billing translations for cy. */
export const cy: Partial<BillingTranslations> = {
  'billing.status.loading': 'Yn llwytho…',
  'billing.status.currentPlan': 'Cynllun cyfredol: {{tierName}}',
  'billing.status.cancelCta': 'Canslo tanysgrifiad',
  'billing.status.cancelError': 'Methwyd canslo. Rhowch gynnig arall arni.',
  'billing.pricing.loading': "Wrthi'n llwytho cynlluniau…",
  'billing.pricing.error': "Methwyd llwytho'r prisio. Rhowch gynnig arall arni yn nes ymlaen.",
  'billing.pricing.checkoutError': 'Methwyd dechrau talu. Rhowch gynnig arall arni.',
  'billing.pricing.reassurance': 'Canslo unrhyw bryd · Nid oes angen cerdyn credyd i ddechrau',
  'billing.pricing.mostPopular': 'Mwyaf poblogaidd',
  'billing.pricing.tierEyebrow': 'Haen',
  'billing.pricing.perSeat': 'fesul sedd',
  'billing.pricing.upgradeCta': 'Uwchraddio i {{tierName}}',
  'billing.pricing.currentCta': 'Cynllun cyfredol',
  'billing.pricing.period.month': 'y mis',
  'billing.pricing.period.year': 'y flwyddyn',
  'billing.pricing.billed.month': 'Yn bilio yn misol',
  'billing.pricing.billed.year': 'Yn bilio yn flynyddol',
  'billing.pricing.unlimited': 'Diderfyn',
  'billing.pricing.limit.maxProjects': 'Uchafswd prosiectau',
  'billing.pricing.limit.canExport': 'Allforio ar gael',
}
