import type { StatusDashboardTranslations } from './types.js'

/** Status dashboard translations for Serbian. */
export const sr: StatusDashboardTranslations = {
  'statusDashboard.error.noProvider': 'Провајдер статусне контролне табле није конфигурисан.',
  'statusDashboard.error.fetchFailed': 'Није успело преузимање статуса: HTTP {{status}}',
  'statusDashboard.label.allOperational': 'Сви системи раде нормално',
  'statusDashboard.label.someIssues': 'Неки системи имају проблеме',
  'statusDashboard.label.majorOutage': 'Велики системски прекид',
  'statusDashboard.label.operational': 'Ради',
  'statusDashboard.label.degraded': 'Деградирано',
  'statusDashboard.label.down': 'Не ради',
  'statusDashboard.label.unknown': 'Непознато',
  'statusDashboard.label.services': 'Сервиси',
  'statusDashboard.label.incidents': 'Инциденти',
  'statusDashboard.label.uptime': 'Време рада',
  'statusDashboard.label.lastChecked': 'Последња провера {{time}}',
  'statusDashboard.label.latency': '{{ms}}ms',
  'statusDashboard.label.noIncidents': 'Нема пријављених инцидената.',
}
