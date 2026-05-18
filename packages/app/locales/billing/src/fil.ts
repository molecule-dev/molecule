import type { BillingTranslations } from './types.js'

/** Billing translations for fil. */
export const fil: Partial<BillingTranslations> = {
  'billing.status.loading': 'Naglo-load…',
  'billing.status.cancelCta': 'Kanselahin ang subscription',
  'billing.pricing.loading': 'Naglo-load ng mga plano…',
  'billing.pricing.error': 'Hindi ma-load ang pagpepresyo. Subukan muli sa ibang pagkakataon.',
  'billing.pricing.checkoutError': 'Hindi masimulan ang checkout. Pakisubukang muli.',
  'billing.pricing.mostPopular': 'Pinakasikat',
  'billing.pricing.upgradeCta': 'I-upgrade sa {{tierName}}',
  'billing.status.currentPlan': 'Kasalukuyang plano:<x> {{TierName}}</x>',
  'billing.status.cancelError': 'Hindi makansela. Pakisubukang muli.',
  'billing.pricing.reassurance':
    'Kanselahin anumang oras · Hindi kailangan ng credit card para makapagsimula',
  'billing.pricing.tierEyebrow': 'Antas',
  'billing.pricing.perSeat': 'bawat upuan',
}
