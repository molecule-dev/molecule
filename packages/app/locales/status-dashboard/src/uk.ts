import type { StatusDashboardTranslations } from './types.js'

/** StatusDashboard translations for uk. */
export const uk: Partial<StatusDashboardTranslations> = {
  'statusDashboard.label.degraded': 'Деградований',
  'statusDashboard.label.down': 'Недоступний',
  'statusDashboard.label.services': 'Сервіси',
  'statusDashboard.label.uptime': 'Час роботи',
  'statusDashboard.label.latency': '{{ms}}мс',
  'statusDashboard.error.noProvider': 'Постачальника панелі керування статусом не налаштовано.',
  'statusDashboard.error.fetchFailed': 'Не вдалося отримати статус: HTTP<x> {{статус}}</x>',
  'statusDashboard.label.allOperational': 'Всі системи працюють',
  'statusDashboard.label.someIssues': 'Деякі системи мають проблеми',
  'statusDashboard.label.majorOutage': 'Серйозний збій системи',
  'statusDashboard.label.operational': 'Операційний',
  'statusDashboard.label.unknown': 'Невідомо',
  'statusDashboard.label.incidents': 'Інциденти',
  'statusDashboard.label.lastChecked': 'Остання перевірка<x> {{час}}</x>',
  'statusDashboard.label.noIncidents': 'Про жодні інциденти не повідомлялося.',
}
