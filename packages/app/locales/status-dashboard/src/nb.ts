import type { StatusDashboardTranslations } from './types.js'

/** Status dashboard translations for Norwegian Bokmål. */
export const nb: StatusDashboardTranslations = {
  'statusDashboard.error.noProvider': 'Statusdashboard-leverandør er ikke konfigurert.',
  'statusDashboard.error.fetchFailed': 'Kunne ikke hente status: HTTP {{status}}',
  'statusDashboard.label.allOperational': 'Alle systemer er operative',
  'statusDashboard.label.someIssues': 'Noen systemer opplever problemer',
  'statusDashboard.label.majorOutage': 'Stort systembrudd',
  'statusDashboard.label.operational': 'Operativ',
  'statusDashboard.label.degraded': 'Forringet',
  'statusDashboard.label.down': 'Nede',
  'statusDashboard.label.unknown': 'Ukjent',
  'statusDashboard.label.services': 'Tjenester',
  'statusDashboard.label.incidents': 'Hendelser',
  'statusDashboard.label.uptime': 'Oppetid',
  'statusDashboard.label.lastChecked': 'Sist sjekket {{time}}',
  'statusDashboard.label.latency': '{{ms}}ms',
  'statusDashboard.label.noIncidents': 'Ingen hendelser rapportert.',
}
