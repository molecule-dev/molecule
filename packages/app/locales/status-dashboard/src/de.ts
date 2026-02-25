import type { StatusDashboardTranslations } from './types.js'

/** Status dashboard translations for German. */
export const de: StatusDashboardTranslations = {
  'statusDashboard.error.noProvider': 'Status-Dashboard-Anbieter ist nicht konfiguriert.',
  'statusDashboard.error.fetchFailed': 'Status konnte nicht abgerufen werden: HTTP {{status}}',
  'statusDashboard.label.allOperational': 'Alle Systeme betriebsbereit',
  'statusDashboard.label.someIssues': 'Einige Systeme haben Probleme',
  'statusDashboard.label.majorOutage': 'Schwerwiegender Systemausfall',
  'statusDashboard.label.operational': 'Betriebsbereit',
  'statusDashboard.label.degraded': 'Beeinträchtigt',
  'statusDashboard.label.down': 'Ausgefallen',
  'statusDashboard.label.unknown': 'Unbekannt',
  'statusDashboard.label.services': 'Dienste',
  'statusDashboard.label.incidents': 'Vorfälle',
  'statusDashboard.label.uptime': 'Verfügbarkeit',
  'statusDashboard.label.lastChecked': 'Zuletzt geprüft {{time}}',
  'statusDashboard.label.latency': '{{ms}}ms',
  'statusDashboard.label.noIncidents': 'Keine Vorfälle gemeldet.',
}
