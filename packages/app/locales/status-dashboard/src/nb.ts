import type { StatusDashboardTranslations } from './types.js'

/** StatusDashboard translations for nb. */
export const nb: Partial<StatusDashboardTranslations> = {
  'statusDashboard.label.degraded': 'Forringet',
  'statusDashboard.label.down': 'Nede',
  'statusDashboard.label.services': 'Tjenester',
  'statusDashboard.label.uptime': 'Oppetid',
  'statusDashboard.error.noProvider': 'Statusdashbordleverandøren er ikke konfigurert.',
  'statusDashboard.error.fetchFailed': 'Kunne ikke hente status: HTTP<x> {{status}}</x>',
  'statusDashboard.label.allOperational': 'Alle systemer i drift',
  'statusDashboard.label.someIssues': 'Noen systemer opplever problemer',
  'statusDashboard.label.majorOutage': 'Stort systembrudd',
  'statusDashboard.label.operational': 'Operasjonell',
  'statusDashboard.label.unknown': 'Ukjent',
  'statusDashboard.label.incidents': 'Hendelser',
  'statusDashboard.label.lastChecked': 'Sist sjekket<x> {{tid}}</x>',
  'statusDashboard.label.latency': '{{ms}} ms',
  'statusDashboard.label.noIncidents': 'Ingen hendelser rapportert.',
}
