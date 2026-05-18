import type { StatusDashboardTranslations } from './types.js'

/** StatusDashboard translations for sv. */
export const sv: Partial<StatusDashboardTranslations> = {
  'statusDashboard.label.operational': 'I drift',
  'statusDashboard.label.degraded': 'Försämrad',
  'statusDashboard.label.down': 'Nere',
  'statusDashboard.label.unknown': 'Okänd',
  'statusDashboard.label.services': 'Tjänster',
  'statusDashboard.label.incidents': 'Incidenter',
  'statusDashboard.label.uptime': 'Drifttid',
  'statusDashboard.error.noProvider': 'Statusöversiktsleverantören har inte konfigurerats.',
  'statusDashboard.error.fetchFailed': 'Misslyckades med att hämta status: HTTP<x> {{status}}</x>',
  'statusDashboard.label.allOperational': 'Alla system i drift',
  'statusDashboard.label.someIssues': 'Vissa system upplever problem',
  'statusDashboard.label.majorOutage': 'Stort systemavbrott',
  'statusDashboard.label.lastChecked': 'Senast kontrollerad<x> {{tid}}</x>',
  'statusDashboard.label.latency': '{{ms}} ms',
  'statusDashboard.label.noIncidents': 'Inga incidenter rapporterade.',
}
