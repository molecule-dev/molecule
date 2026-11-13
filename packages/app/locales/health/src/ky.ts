import type { HealthTranslations } from './types.js'

/** Health translations for Kyrgyz. */
export const ky: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}с {{minutes}}мин',
  'health.durationMinutes': '{{minutes}}мин',
  'health.error.noProvider':
    '`@molecule/app-health`: Ден соолукту чыңдоо провайдери байланыштырылган эмес — `HealthProvider` интерфейсин өзүңүздүн иштөө убакытыңызга (Apple HealthKit / Android Health Connect / Google Fit) орнотуп, аны ишке киргизүүдө `setProvider()` менен байланыштырыңыз. Molecule ага эч кандай провайдер жөнөтпөйт. Чалуудан мурун `hasProvider()` же `getCapabilities().supported` менен функцияларды аныктоо — ден соолукту чыңдоо көрсөткүчүндө чынчыл демейки шарт жок, андыктан бул жасалма маалыматтарды кайтаруунун ордуна ыргытат.',
}
