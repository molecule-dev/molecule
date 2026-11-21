import type { BillingTranslations } from './types.js'

/** Billing translations for be. */
export const be: Partial<BillingTranslations> = {
  'billing.status.loading': 'Загрузка…',
  'billing.status.currentPlan': 'Бягучы план: {{tierName}}',
  'billing.status.cancelCta': 'Адмяніць падпіску',
  'billing.status.cancelError': 'Не атрымалася адмяніць. Паўтарыце спробу.',
  'billing.pricing.loading': 'Загрузка планаў…',
  'billing.pricing.error': 'Не атрымалася загрузіць цэны. Паўтарыце спробу пазней.',
  'billing.pricing.checkoutError': 'Не атрымалася пачаць афармленне замовы. Паўтарыце спробу.',
  'billing.pricing.reassurance': 'Адмяніць у любы час · Для пачатку крэдытная карта не патрабуецца',
  'billing.pricing.mostPopular': 'Найбольш папулярныя',
  'billing.pricing.tierEyebrow': 'Узровень',
  'billing.pricing.perSeat': 'на месца',
  'billing.pricing.upgradeCta': 'Абнавіць да {{tierName}}',
  'billing.pricing.currentCta': 'Бягучы план',
  'billing.pricing.period.month': 'у месяц',
  'billing.pricing.period.year': 'у год',
  'billing.pricing.billed.month': 'Аплата штомесяц',
  'billing.pricing.billed.year': 'Аплата штогод',
  'billing.pricing.unlimited': 'Неабмежавана',
  'billing.pricing.limit.maxProjects': 'Максімальная колькасць праектаў',
  'billing.pricing.limit.canExport': 'Экспарт даступны',
}
