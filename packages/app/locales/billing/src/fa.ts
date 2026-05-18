import type { BillingTranslations } from './types.js'

/** Billing translations for fa. */
export const fa: Partial<BillingTranslations> = {
  'billing.status.loading': 'در حال بارگذاری…',
  'billing.status.currentPlan': 'طرح فعلی:<x> {{tierName}}</x>',
  'billing.status.cancelCta': 'لغو اشتراک',
  'billing.status.cancelError': 'لغو نشد. لطفا دوباره امتحان کنید.',
  'billing.pricing.loading': 'در حال بارگذاری نقشه‌ها…',
  'billing.pricing.error': 'قیمت‌گذاری بارگیری نشد. بعداً دوباره امتحان کنید.',
  'billing.pricing.checkoutError': 'پرداخت شروع نشد. لطفا دوباره امتحان کنید.',
  'billing.pricing.reassurance': 'لغو در هر زمان · برای شروع نیازی به کارت اعتباری نیست',
  'billing.pricing.mostPopular': 'محبوب ترین',
  'billing.pricing.tierEyebrow': 'ردیف',
  'billing.pricing.perSeat': 'به ازای هر صندلی',
  'billing.pricing.upgradeCta': 'ارتقا به<x> {{tierName}}</x>',
}
