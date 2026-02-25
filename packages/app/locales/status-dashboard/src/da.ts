import type { StatusDashboardTranslations } from './types.js'

/** Status dashboard translations for Danish. */
export const da: StatusDashboardTranslations = {
  'statusDashboard.error.noProvider': 'Statusdashboard-udbyder er ikke konfigureret.',
  'statusDashboard.error.fetchFailed': 'Kunne ikke hente status: HTTP {{status}}',
  'statusDashboard.label.allOperational': 'Alle systemer er operationelle',
  'statusDashboard.label.someIssues': 'Nogle systemer oplever problemer',
  'statusDashboard.label.majorOutage': 'Større systemnedbrud',
  'statusDashboard.label.operational': 'Operationel',
  'statusDashboard.label.degraded': 'Forringet',
  'statusDashboard.label.down': 'Nede',
  'statusDashboard.label.unknown': 'Ukendt',
  'statusDashboard.label.services': 'Tjenester',
  'statusDashboard.label.incidents': 'Hændelser',
  'statusDashboard.label.uptime': 'Oppetid',
  'statusDashboard.label.lastChecked': 'Sidst kontrolleret {{time}}',
  'statusDashboard.label.latency': '{{ms}}ms',
  'statusDashboard.label.noIncidents': 'Ingen hændelser rapporteret.',
}
