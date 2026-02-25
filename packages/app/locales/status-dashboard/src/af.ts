import type { StatusDashboardTranslations } from './types.js'

/** Status dashboard translations for Afrikaans. */
export const af: StatusDashboardTranslations = {
  'statusDashboard.error.noProvider': 'Status-dashbordverskaffer is nie gekonfigureer nie.',
  'statusDashboard.error.fetchFailed': 'Kon nie status ophaal nie: HTTP {{status}}',
  'statusDashboard.label.allOperational': 'Alle stelsels is operasioneel',
  'statusDashboard.label.someIssues': 'Sommige stelsels ondervind probleme',
  'statusDashboard.label.majorOutage': 'Groot stelselonderbreking',
  'statusDashboard.label.operational': 'Operasioneel',
  'statusDashboard.label.degraded': 'Verswak',
  'statusDashboard.label.down': 'Af',
  'statusDashboard.label.unknown': 'Onbekend',
  'statusDashboard.label.services': 'Dienste',
  'statusDashboard.label.incidents': 'Voorvalle',
  'statusDashboard.label.uptime': 'Uptyd',
  'statusDashboard.label.lastChecked': 'Laas nagegaan {{time}}',
  'statusDashboard.label.latency': '{{ms}}ms',
  'statusDashboard.label.noIncidents': 'Geen voorvalle aangemeld nie.',
}
