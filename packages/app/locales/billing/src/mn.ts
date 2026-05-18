import type { BillingTranslations } from './types.js'

/** Billing translations for mn. */
export const mn: Partial<BillingTranslations> = {
  'billing.status.loading': 'Ачааллаж байна…',
  'billing.status.currentPlan': 'Одоогийн төлөвлөгөө:<x> {{тиймэрийнНэр}}</x>',
  'billing.status.cancelCta': 'Захиалгыг цуцлах',
  'billing.status.cancelError': 'Цуцлах боломжгүй байна. Дахин оролдоно уу.',
  'billing.pricing.loading': 'Төлөвлөгөөг ачаалж байна…',
  'billing.pricing.error': 'Үнийг ачаалж чадсангүй. Дараа дахин оролдоно уу.',
  'billing.pricing.checkoutError': 'Төлбөр тооцоог эхлүүлж чадсангүй. Дахин оролдоно уу.',
  'billing.pricing.reassurance': 'Хүссэн үедээ цуцлах · Эхлүүлэхийн тулд зээлийн карт шаардлагагүй',
  'billing.pricing.mostPopular': 'Хамгийн алдартай',
  'billing.pricing.tierEyebrow': 'Түвшин',
  'billing.pricing.perSeat': 'суудал тутамд',
  'billing.pricing.upgradeCta': 'Шинэчлэх<x> {{тиймэрийнНэр}}</x>',
}
