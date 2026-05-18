import type { BillingTranslations } from './types.js'

/** Billing translations for lv. */
export const lv: Partial<BillingTranslations> = {
  'billing.status.loading': 'Notiek ielāde…',
  'billing.status.currentPlan': 'Pašreizējais plāns:<x> {{tierName}}</x>',
  'billing.status.cancelCta': 'Atcelt abonementu',
  'billing.status.cancelError': 'Nevarēja atcelt. Lūdzu, mēģiniet vēlreiz.',
  'billing.pricing.loading': 'Notiek plānu ielāde…',
  'billing.pricing.error': 'Nevarēja ielādēt cenas. Mēģiniet vēlreiz vēlāk.',
  'billing.pricing.checkoutError': 'Nevarēja sākt norēķināšanos. Lūdzu, mēģiniet vēlreiz.',
  'billing.pricing.reassurance': 'Atcelt jebkurā laikā · Lai sāktu, kredītkarte nav nepieciešama',
  'billing.pricing.mostPopular': 'Populārākais',
  'billing.pricing.tierEyebrow': 'Līmenis',
  'billing.pricing.perSeat': 'uz vienu vietu',
  'billing.pricing.upgradeCta': 'Jaunināt uz<x> {{tierName}}</x>',
}
