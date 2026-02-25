import type { StatusDashboardTranslations } from './types.js'

/** Status dashboard translations for Polish. */
export const pl: StatusDashboardTranslations = {
  'statusDashboard.error.noProvider': 'Dostawca panelu statusu nie jest skonfigurowany.',
  'statusDashboard.error.fetchFailed': 'Nie udało się pobrać statusu: HTTP {{status}}',
  'statusDashboard.label.allOperational': 'Wszystkie systemy działają prawidłowo',
  'statusDashboard.label.someIssues': 'Niektóre systemy mają problemy',
  'statusDashboard.label.majorOutage': 'Poważna awaria systemu',
  'statusDashboard.label.operational': 'Działa',
  'statusDashboard.label.degraded': 'Pogorszone',
  'statusDashboard.label.down': 'Nie działa',
  'statusDashboard.label.unknown': 'Nieznany',
  'statusDashboard.label.services': 'Usługi',
  'statusDashboard.label.incidents': 'Incydenty',
  'statusDashboard.label.uptime': 'Czas pracy',
  'statusDashboard.label.lastChecked': 'Ostatnio sprawdzono {{time}}',
  'statusDashboard.label.latency': '{{ms}}ms',
  'statusDashboard.label.noIncidents': 'Nie zgłoszono żadnych incydentów.',
}
