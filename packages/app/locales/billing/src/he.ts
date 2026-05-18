import type { BillingTranslations } from './types.js'

/** Billing translations for he. */
export const he: Partial<BillingTranslations> = {
  'billing.status.loading': 'טְעִינָה…',
  'billing.status.cancelCta': 'ביטול המנוי',
  'billing.pricing.mostPopular': 'הכי פופולרי',
  'billing.status.currentPlan': 'תוכנית נוכחית:<x> {{tierName}}</x>',
  'billing.status.cancelError': 'לא ניתן היה לבטל. אנא נסה שוב.',
  'billing.pricing.loading': 'טוען תוכניות...',
  'billing.pricing.error': 'לא ניתן היה לטעון את התמחור. נסה שוב מאוחר יותר.',
  'billing.pricing.checkoutError': 'לא ניתן היה להתחיל את תהליך התשלום. אנא נסה שוב.',
  'billing.pricing.reassurance': 'ביטול בכל עת · אין צורך בכרטיס אשראי כדי להתחיל',
  'billing.pricing.tierEyebrow': 'נִדבָּך',
  'billing.pricing.perSeat': 'לכל מושב',
  'billing.pricing.upgradeCta': 'שדרג ל<x> {{tierName}}</x>',
}
