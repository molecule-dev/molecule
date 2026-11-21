import type { BillingTranslations } from './types.js'

/** Billing translations for ky. */
export const ky: Partial<BillingTranslations> = {
  'billing.status.loading': 'Жүктөлүүдө…',
  'billing.status.currentPlan': 'Учурдагы план: {{tierName}}',
  'billing.status.cancelCta': 'Жазылууну жокко чыгаруу',
  'billing.status.cancelError': 'Жокко чыгаруу мүмкүн болгон жок. Кайра аракет кылып көрүңүз.',
  'billing.pricing.loading': 'Пландар жүктөлүүдө…',
  'billing.pricing.error': 'Баалар жүктөлбөй койду. Кийинчерээк кайра аракет кылыңыз.',
  'billing.pricing.checkoutError': 'Төлөм башталган жок. Кайра аракет кылып көрүңүз.',
  'billing.pricing.reassurance':
    'Каалаган убакта жокко чыгарыңыз · Баштоо үчүн кредиттик карта талап кылынбайт',
  'billing.pricing.mostPopular': 'Эң популярдуу',
  'billing.pricing.tierEyebrow': 'Деңгээл',
  'billing.pricing.perSeat': 'бир орунга',
  'billing.pricing.upgradeCta': 'Жаңыртуу {{tierName}}',
  'billing.pricing.currentCta': 'Учурдагы план',
  'billing.pricing.period.month': 'айына',
  'billing.pricing.period.year': 'жылына',
  'billing.pricing.billed.month': 'Ай сайын эсептелет',
  'billing.pricing.billed.year': 'Жыл сайын эсептелет',
  'billing.pricing.unlimited': 'Чексиз',
  'billing.pricing.limit.maxProjects': 'Максимум долбоор',
  'billing.pricing.limit.canExport': 'Экспорттоо мүмкүн',
}
