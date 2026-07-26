import type { StatusDashboardTranslations } from './types.js'

/** StatusDashboard translations for de. */
export const de: Partial<StatusDashboardTranslations> = {
  'statusDashboard.label.operational': 'Betriebsbereit',
  'statusDashboard.label.degraded': 'Verschlechtert',
  'statusDashboard.label.down': 'Ausgefallen',
  'statusDashboard.label.unknown': 'Unbekannt',
  'statusDashboard.label.services': 'Dienste',
  'statusDashboard.label.incidents': 'Vorfälle',
  'statusDashboard.label.uptime': 'Verfügbarkeit',
  'statusDashboard.error.noProvider':
    'Der Anbieter für das Status-Dashboard ist nicht konfiguriert.',
  'statusDashboard.error.fetchFailed': 'Status konnte nicht abgerufen werden: HTTP {{status}}',
  'statusDashboard.label.allOperational': 'Alle Systeme betriebsbereit',
  'statusDashboard.label.someIssues': 'Bei einigen Systemen treten Probleme auf',
  'statusDashboard.label.majorOutage': 'Schwerwiegender Systemausfall',
  'statusDashboard.label.lastChecked': 'Zuletzt geprüft {{time}}',
  'statusDashboard.label.latency': '{{ms}} MS',
  'statusDashboard.label.noIncidents': 'Es wurden keine Vorfälle gemeldet.',
}
