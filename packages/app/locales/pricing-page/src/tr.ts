import type { PricingPageTranslations } from './types.js'

/** PricingPage translations for tr. */
export const tr: Partial<PricingPageTranslations> = {
  'pricingPage.loading': 'Planlar yükleniyor…',
  'pricingPage.error': 'Fiyatlandırma yüklenemedi. Daha sonra tekrar deneyin.',
  'pricingPage.checkoutError': 'Ödeme başlatılamadı. Lütfen tekrar deneyin.',
  'pricingPage.upgradeCta': '{{tierName}} planına yükseltin',
  'pricingPage.currentCta': 'Mevcut plan',
  'pricingPage.periodToggle.monthly': 'Aylık',
  'pricingPage.periodToggle.yearly': 'Yıllık',
  'pricingPage.planUpdated.heading': 'Planınız güncellendi',
  'pricingPage.heading': 'Planınızı seçin',
  'pricingPage.perSeat': 'koltuk başına',
  'pricingPage.periodToggle.label': 'Fatura dönemi',
  'pricingPage.planUpdated.body':
    'Yükseltme işleminiz için teşekkürler. Yeni planınız hemen aktif hale geldi ve size bir makbuz e-posta ile gönderildi.',
  'pricingPage.planUpdated.headingNamed': 'Şu anda şu sayfadasınız:<x> {{planName}}</x> plan',
}
