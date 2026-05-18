import type { BillingTranslations } from './types.js'

/** Billing translations for tr. */
export const tr: Partial<BillingTranslations> = {
  'billing.status.loading': 'Yükleniyor…',
  'billing.status.cancelCta': 'Aboneliği iptal et',
  'billing.pricing.loading': 'Planlar yükleniyor…',
  'billing.pricing.error': 'Fiyatlandırma yüklenemedi. Daha sonra tekrar deneyin.',
  'billing.pricing.checkoutError': 'Ödeme başlatılamadı. Lütfen tekrar deneyin.',
  'billing.pricing.mostPopular': 'En popüler',
  'billing.pricing.tierEyebrow': 'Kademe',
  'billing.pricing.upgradeCta': '{{tierName}} planına yükseltin',
  'billing.status.currentPlan': 'Mevcut plan:<x> {{tierName}}</x>',
  'billing.status.cancelError': 'İptal işlemi gerçekleştirilemedi. Lütfen tekrar deneyin.',
  'billing.pricing.reassurance':
    'İstediğiniz zaman iptal edebilirsiniz · Başlamak için kredi kartı gerekmez',
  'billing.pricing.perSeat': 'koltuk başına',
}
