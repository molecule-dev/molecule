import type { StatusDashboardTranslations } from './types.js'

/** Status dashboard translations for Kyrgyz. */
export const ky: StatusDashboardTranslations = {
  'statusDashboard.error.noProvider': 'Статус панелинин провайдери конфигурацияланган эмес.',
  'statusDashboard.error.fetchFailed': 'Статусту алуу мүмкүн болгон жок: HTTP {{status}}',
  'statusDashboard.label.allOperational': 'Бардык системалар иштеп жатат',
  'statusDashboard.label.someIssues': 'Кээ бир системаларда көйгөйлөр бар',
  'statusDashboard.label.majorOutage': 'Олуттуу система үзгүлтүгү',
  'statusDashboard.label.operational': 'Иштеп жатат',
  'statusDashboard.label.degraded': 'Начарлаган',
  'statusDashboard.label.down': 'Иштебей жатат',
  'statusDashboard.label.unknown': 'Белгисиз',
  'statusDashboard.label.services': 'Кызматтар',
  'statusDashboard.label.incidents': 'Окуялар',
  'statusDashboard.label.uptime': 'Иштөө убактысы',
  'statusDashboard.label.lastChecked': 'Акыркы текшерүү {{time}}',
  'statusDashboard.label.latency': '{{ms}}ms',
  'statusDashboard.label.noIncidents': 'Эч кандай окуя катталган жок.',
}
