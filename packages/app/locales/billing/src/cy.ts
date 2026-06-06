import type { BillingTranslations } from './types.js'

/** Billing translations for cy. */
export const cy: Partial<BillingTranslations> = {
  'billing.status.loading': 'Yn llwytho…',
  'billing.status.currentPlan': 'Cynllun cyfredol:<x> {{EnwHaen}}</x>',
  'billing.status.cancelCta': 'Canslo tanysgrifiad',
  'billing.status.cancelError': 'Methwyd canslo. Rhowch gynnig arall arni.',
  'billing.pricing.loading': "Wrthi'n llwytho cynlluniau…",
  'billing.pricing.error': "Methwyd llwytho'r prisio. Rhowch gynnig arall arni yn nes ymlaen.",
  'billing.pricing.checkoutError': 'Methwyd dechrau talu. Rhowch gynnig arall arni.',
  'billing.pricing.reassurance': 'Canslo unrhyw bryd · Nid oes angen cerdyn credyd i ddechrau',
  'billing.pricing.mostPopular': 'Mwyaf poblogaidd',
  'billing.pricing.tierEyebrow': 'Haen',
  'billing.pricing.perSeat': 'fesul sedd',
  'billing.pricing.upgradeCta': 'Uwchraddio i<x> {{EnwHaen}}</x>',
}
