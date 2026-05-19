import type { PricingPageTranslations } from './types.js'

/** PricingPage translations for uk. */
export const uk: Partial<PricingPageTranslations> = {
  'pricingPage.loading': 'Завантаження планів…',
  'pricingPage.error': 'Не вдалося завантажити ціни. Спробуйте пізніше.',
  'pricingPage.checkoutError': 'Не вдалося розпочати оформлення. Будь ласка, спробуйте ще раз.',
  'pricingPage.upgradeCta': 'Перейти на {{tierName}}',
  'pricingPage.currentCta': 'Поточний план',
  'pricingPage.periodToggle.monthly': 'Щомісяця',
  'pricingPage.periodToggle.yearly': 'Щорічно',
  'pricingPage.heading': 'Оберіть свій план',
  'pricingPage.perSeat': 'за місце',
  'pricingPage.periodToggle.label': 'Розрахунковий період',
  'pricingPage.planUpdated.heading': 'Ваш план оновлено',
  'pricingPage.planUpdated.body':
    'Дякуємо за оновлення. Ваш новий план активний негайно, і вам надіслано квитанцію.',
  'pricingPage.planUpdated.headingNamed': 'Ви зараз на<x> {{Назва плану}}</x> план',
}
