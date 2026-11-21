import type { BillingTranslations } from './types.js'

/** Billing translations for az. */
export const az: Partial<BillingTranslations> = {
  'billing.status.loading': 'Yüklənir…',
  'billing.status.currentPlan': 'Cari plan: {{tierName}}',
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
  'billing.pricing.upgradeCta': 'Təkmilləşdirin {{tierName}}',
  'billing.pricing.currentCta': 'Cari plan',
  'billing.pricing.period.month': 'ayda',
  'billing.pricing.period.year': 'ildə',
  'billing.pricing.billed.month': 'Aylıq fakturalanır',
  'billing.pricing.billed.year': 'İllik fakturalanır',
  'billing.pricing.unlimited': 'Qeyri-məhdud',
  'billing.pricing.limit.maxProjects': 'Maksimum layihə sayı',
  'billing.pricing.limit.canExport': 'Eksport mümkündür',
}
