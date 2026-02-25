import type { StatusDashboardTranslations } from './types.js'

/** Status dashboard translations for Russian. */
export const ru: StatusDashboardTranslations = {
  'statusDashboard.error.noProvider': 'Поставщик панели статуса не настроен.',
  'statusDashboard.error.fetchFailed': 'Не удалось получить статус: HTTP {{status}}',
  'statusDashboard.label.allOperational': 'Все системы работают нормально',
  'statusDashboard.label.someIssues': 'Некоторые системы испытывают проблемы',
  'statusDashboard.label.majorOutage': 'Серьёзный сбой системы',
  'statusDashboard.label.operational': 'Работает',
  'statusDashboard.label.degraded': 'Ухудшение',
  'statusDashboard.label.down': 'Не работает',
  'statusDashboard.label.unknown': 'Неизвестно',
  'statusDashboard.label.services': 'Сервисы',
  'statusDashboard.label.incidents': 'Инциденты',
  'statusDashboard.label.uptime': 'Время работы',
  'statusDashboard.label.lastChecked': 'Последняя проверка {{time}}',
  'statusDashboard.label.latency': '{{ms}}ms',
  'statusDashboard.label.noIncidents': 'Инцидентов не зарегистрировано.',
}
