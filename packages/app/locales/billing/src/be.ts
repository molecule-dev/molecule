import type { BillingTranslations } from './types.js'

/** Billing translations for be. */
export const be: Partial<BillingTranslations> = {
  'billing.status.loading': 'Загрузка…',
  'billing.status.currentPlan': 'Бягучы план:<x> {{tierName}}</x>',
  'billing.status.cancelCta': 'Адмяніць падпіску',
  'billing.status.cancelError': 'Не атрымалася адмяніць. Паўтарыце спробу.',
  'billing.pricing.loading': 'Загрузка планаў…',
  'billing.pricing.error': 'Не атрымалася загрузіць цэны. Паўтарыце спробу пазней.',
  'billing.pricing.checkoutError': 'Не атрымалася пачаць афармленне замовы. Паўтарыце спробу.',
  'billing.pricing.reassurance': 'Адмяніць у любы час · Для пачатку крэдытная карта не патрабуецца',
  'billing.pricing.mostPopular': 'Найбольш папулярныя',
  'billing.pricing.tierEyebrow': 'Узровень',
  'billing.pricing.perSeat': 'на месца',
  'billing.pricing.upgradeCta': 'Абнавіць да<x> {{tierName}}</x>',
}
