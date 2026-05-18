import type { StatusDashboardTranslations } from './types.js'

/** StatusDashboard translations for nl. */
export const nl: Partial<StatusDashboardTranslations> = {
  'statusDashboard.label.operational': 'Operationeel',
  'statusDashboard.label.degraded': 'Verminderd',
  'statusDashboard.label.down': 'Offline',
  'statusDashboard.label.unknown': 'Onbekend',
  'statusDashboard.label.incidents': 'Incidenten',
  'statusDashboard.error.noProvider': 'Statusdashboardprovider niet geconfigureerd.',
  'statusDashboard.error.fetchFailed': 'Status ophalen mislukt: HTTP<x> {{status}}</x>',
  'statusDashboard.label.allOperational': 'Alle systemen zijn operationeel.',
  'statusDashboard.label.someIssues': 'Sommige systemen ondervinden problemen.',
  'statusDashboard.label.majorOutage': 'Grote systeemstoring',
  'statusDashboard.label.services': 'Diensten',
  'statusDashboard.label.uptime': 'Beschikbaarheid',
  'statusDashboard.label.lastChecked': 'Laatst gecontroleerd<x> {{tijd}}</x>',
  'statusDashboard.label.latency': '{{mevrouw}} mevrouw',
  'statusDashboard.label.noIncidents': 'Geen incidenten gemeld.',
}
