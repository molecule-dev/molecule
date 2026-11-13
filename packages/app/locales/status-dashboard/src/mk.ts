import type { StatusDashboardTranslations } from './types.js'

/** Status dashboard translations for Macedonian. */
export const mk: StatusDashboardTranslations = {
  'statusDashboard.error.fetchFailed': 'Неуспешно преземање на статусот: HTTP {{status}}',
  'statusDashboard.label.allOperational': 'Сите системи работат нормално',
  'statusDashboard.label.someIssues': 'Некои системи имаат проблеми',
  'statusDashboard.label.majorOutage': 'Голем системски прекин',
  'statusDashboard.label.operational': 'Работи',
  'statusDashboard.label.degraded': 'Деградирано',
  'statusDashboard.label.down': 'Не работи',
  'statusDashboard.label.unknown': 'Непознато',
  'statusDashboard.label.services': 'Сервиси',
  'statusDashboard.label.incidents': 'Инциденти',
  'statusDashboard.label.uptime': 'Време на работа',
  'statusDashboard.label.lastChecked': 'Последна проверка {{time}}',
  'statusDashboard.label.latency': '{{ms}}ms',
  'statusDashboard.label.noIncidents': 'Нема пријавени инциденти.',
  'statusDashboard.error.noProvider':
    'Давателот на услугата за контролна табла за статус не е конфигуриран. Прво поврзете го давателот на услугата за контролна табла за статус.',
}
