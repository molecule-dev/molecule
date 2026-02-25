import type { StatusDashboardTranslations } from './types.js'

/** Status dashboard translations for Dutch. */
export const nl: StatusDashboardTranslations = {
  'statusDashboard.error.noProvider': 'Statusdashboard-provider is niet geconfigureerd.',
  'statusDashboard.error.fetchFailed': 'Kan status niet ophalen: HTTP {{status}}',
  'statusDashboard.label.allOperational': 'Alle systemen zijn operationeel',
  'statusDashboard.label.someIssues': 'Sommige systemen ondervinden problemen',
  'statusDashboard.label.majorOutage': 'Grote systeemstoring',
  'statusDashboard.label.operational': 'Operationeel',
  'statusDashboard.label.degraded': 'Verslechterd',
  'statusDashboard.label.down': 'Niet beschikbaar',
  'statusDashboard.label.unknown': 'Onbekend',
  'statusDashboard.label.services': 'Diensten',
  'statusDashboard.label.incidents': 'Incidenten',
  'statusDashboard.label.uptime': 'Uptime',
  'statusDashboard.label.lastChecked': 'Laatst gecontroleerd {{time}}',
  'statusDashboard.label.latency': '{{ms}}ms',
  'statusDashboard.label.noIncidents': 'Geen incidenten gemeld.',
}
