import type { StatusDashboardTranslations } from './types.js'

/** Status dashboard translations for Swedish. */
export const sv: StatusDashboardTranslations = {
  'statusDashboard.error.noProvider': 'Statusöversiktens leverantör är inte konfigurerad.',
  'statusDashboard.error.fetchFailed': 'Kunde inte hämta status: HTTP {{status}}',
  'statusDashboard.label.allOperational': 'Alla system fungerar normalt',
  'statusDashboard.label.someIssues': 'Vissa system upplever problem',
  'statusDashboard.label.majorOutage': 'Allvarligt systemavbrott',
  'statusDashboard.label.operational': 'Fungerar',
  'statusDashboard.label.degraded': 'Försämrad',
  'statusDashboard.label.down': 'Nere',
  'statusDashboard.label.unknown': 'Okänd',
  'statusDashboard.label.services': 'Tjänster',
  'statusDashboard.label.incidents': 'Incidenter',
  'statusDashboard.label.uptime': 'Drifttid',
  'statusDashboard.label.lastChecked': 'Senast kontrollerad {{time}}',
  'statusDashboard.label.latency': '{{ms}}ms',
  'statusDashboard.label.noIncidents': 'Inga incidenter rapporterade.',
}
