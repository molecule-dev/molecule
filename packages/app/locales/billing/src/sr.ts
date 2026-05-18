import type { BillingTranslations } from './types.js'

/** Billing translations for sr. */
export const sr: Partial<BillingTranslations> = {
  'billing.status.loading': 'Учитавање…',
  'billing.status.currentPlan': 'Тренутни план:<x> {{tierName}}</x>',
  'billing.status.cancelCta': 'Откажи претплату',
  'billing.status.cancelError': 'Није могуће отказати. Молимо покушајте поново.',
  'billing.pricing.loading': 'Учитавање планова…',
  'billing.pricing.error': 'Није могуће учитати цене. Покушајте поново касније.',
  'billing.pricing.checkoutError': 'Није могуће покренути плаћање. Молимо покушајте поново.',
  'billing.pricing.reassurance': 'Откажите било када · Није потребна кредитна картица за почетак',
  'billing.pricing.mostPopular': 'Најпопуларније',
  'billing.pricing.tierEyebrow': 'Ниво',
  'billing.pricing.perSeat': 'по седишту',
  'billing.pricing.upgradeCta': 'Надоградите на<x> {{tierName}}</x>',
}
