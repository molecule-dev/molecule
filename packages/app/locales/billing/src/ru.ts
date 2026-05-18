import type { BillingTranslations } from './types.js'

/** Billing translations for ru. */
export const ru: Partial<BillingTranslations> = {
  'billing.status.loading': 'Загрузка…',
  'billing.status.currentPlan': 'Текущий план:<x> {{tierName}}</x>',
  'billing.status.cancelCta': 'Отменить подписку',
  'billing.status.cancelError': 'Отменить не удалось. Пожалуйста, попробуйте еще раз.',
  'billing.pricing.loading': 'Планы погрузки…',
  'billing.pricing.error': 'Не удалось загрузить цены. Попробуйте позже.',
  'billing.pricing.checkoutError':
    'Не удалось начать оформление заказа. Пожалуйста, попробуйте еще раз.',
  'billing.pricing.reassurance':
    'Отменить можно в любое время · Для начала не требуется кредитная карта',
  'billing.pricing.mostPopular': 'Самые популярные',
  'billing.pricing.tierEyebrow': 'Уровень',
  'billing.pricing.perSeat': 'за место',
  'billing.pricing.upgradeCta': 'Обновить до<x> {{tierName}}</x>',
}
