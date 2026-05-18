import type { BillingTranslations } from './types.js'

/** Billing translations for az. */
export const az: Partial<BillingTranslations> = {
  'billing.status.loading': 'Yüklənir…',
  'billing.status.currentPlan': 'Cari plan:<x> {{tierName}}</x>',
  'billing.status.cancelCta': 'Abunəliyi ləğv edin',
  'billing.status.cancelError': 'Ləğv etmək mümkün olmadı. Yenidən cəhd edin.',
  'billing.pricing.loading': 'Planlar yüklənir…',
  'billing.pricing.error': 'Qiymətləri yükləmək mümkün olmadı. Daha sonra yenidən cəhd edin.',
  'billing.pricing.checkoutError': 'Ödəniş başlaya bilmədi. Zəhmət olmasa, yenidən cəhd edin.',
  'billing.pricing.reassurance':
    'İstənilən vaxt ləğv edin · Başlamaq üçün kredit kartı tələb olunmur',
  'billing.pricing.mostPopular': 'Ən populyar',
  'billing.pricing.tierEyebrow': 'Səviyyə',
  'billing.pricing.perSeat': 'hər oturacaq üçün',
  'billing.pricing.upgradeCta': 'Təkmilləşdirin<x> {{tierName}}</x>',
}
