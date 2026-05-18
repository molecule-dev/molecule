import type { BillingTranslations } from './types.js'

/** Billing translations for el. */
export const el: Partial<BillingTranslations> = {
  'billing.status.loading': 'Φόρτωση…',
  'billing.status.cancelCta': 'Ακύρωση συνδρομής',
  'billing.pricing.loading': 'Φόρτωση πλάνων…',
  'billing.pricing.error': 'Δεν ήταν δυνατή η φόρτωση τιμών. Δοκιμάστε ξανά αργότερα.',
  'billing.pricing.checkoutError':
    'Δεν ήταν δυνατή η έναρξη ολοκλήρωσης αγοράς. Παρακαλώ δοκιμάστε ξανά.',
  'billing.pricing.mostPopular': 'Πιο δημοφιλές',
  'billing.pricing.upgradeCta': 'Αναβάθμιση σε {{tierName}}',
}
