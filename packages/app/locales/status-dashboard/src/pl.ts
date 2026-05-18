import type { StatusDashboardTranslations } from './types.js'

/** StatusDashboard translations for pl. */
export const pl: Partial<StatusDashboardTranslations> = {
  'statusDashboard.label.operational': 'Działa',
  'statusDashboard.label.degraded': 'Pogorszone',
  'statusDashboard.label.down': 'Niedostępne',
  'statusDashboard.label.unknown': 'Nieznany',
  'statusDashboard.label.services': 'Usługi',
  'statusDashboard.label.incidents': 'Incydenty',
  'statusDashboard.label.uptime': 'Dostępność',
  'statusDashboard.error.noProvider':
    'Dostawca pulpitu nawigacyjnego stanu nie został skonfigurowany.',
  'statusDashboard.error.fetchFailed': 'Nie udało się pobrać statusu: HTTP<x> {{status}}</x>',
  'statusDashboard.label.allOperational': 'Wszystkie systemy działają',
  'statusDashboard.label.someIssues': 'Niektóre systemy doświadczają problemów',
  'statusDashboard.label.majorOutage': 'Poważna awaria systemu',
  'statusDashboard.label.lastChecked': 'Ostatnio sprawdzono<x> {{czas}}</x>',
  'statusDashboard.label.latency': '{{SM}} SM',
  'statusDashboard.label.noIncidents': 'Nie zgłoszono żadnych incydentów.',
}
