import type { StatusDashboardTranslations } from './types.js'

/** Status dashboard translations for Bulgarian. */
export const bg: StatusDashboardTranslations = {
  'statusDashboard.error.noProvider': 'Доставчикът на табло за състоянието не е конфигуриран.',
  'statusDashboard.error.fetchFailed': 'Неуспешно извличане на състоянието: HTTP {{status}}',
  'statusDashboard.label.allOperational': 'Всички системи работят нормално',
  'statusDashboard.label.someIssues': 'Някои системи изпитват проблеми',
  'statusDashboard.label.majorOutage': 'Голям системен срив',
  'statusDashboard.label.operational': 'Работи',
  'statusDashboard.label.degraded': 'Влошено',
  'statusDashboard.label.down': 'Не работи',
  'statusDashboard.label.unknown': 'Неизвестно',
  'statusDashboard.label.services': 'Услуги',
  'statusDashboard.label.incidents': 'Инциденти',
  'statusDashboard.label.uptime': 'Време на работа',
  'statusDashboard.label.lastChecked': 'Последна проверка {{time}}',
  'statusDashboard.label.latency': '{{ms}}ms',
  'statusDashboard.label.noIncidents': 'Няма докладвани инциденти.',
}
