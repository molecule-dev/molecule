import type { StatusDashboardTranslations } from './types.js'

/** Status dashboard translations for Ukrainian. */
export const uk: StatusDashboardTranslations = {
  'statusDashboard.error.noProvider': 'Постачальник панелі статусу не налаштований.',
  'statusDashboard.error.fetchFailed': 'Не вдалося отримати статус: HTTP {{status}}',
  'statusDashboard.label.allOperational': 'Усі системи працюють нормально',
  'statusDashboard.label.someIssues': 'Деякі системи мають проблеми',
  'statusDashboard.label.majorOutage': 'Серйозний збій системи',
  'statusDashboard.label.operational': 'Працює',
  'statusDashboard.label.degraded': 'Погіршення',
  'statusDashboard.label.down': 'Не працює',
  'statusDashboard.label.unknown': 'Невідомо',
  'statusDashboard.label.services': 'Сервіси',
  'statusDashboard.label.incidents': 'Інциденти',
  'statusDashboard.label.uptime': 'Час роботи',
  'statusDashboard.label.lastChecked': 'Остання перевірка {{time}}',
  'statusDashboard.label.latency': '{{ms}}ms',
  'statusDashboard.label.noIncidents': 'Інцидентів не зареєстровано.',
}
