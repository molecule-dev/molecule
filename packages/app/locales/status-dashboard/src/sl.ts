import type { StatusDashboardTranslations } from './types.js'

/** Status dashboard translations for Slovenian. */
export const sl: StatusDashboardTranslations = {
  'statusDashboard.error.noProvider': 'Ponudnik nadzorne plošče stanja ni konfiguriran.',
  'statusDashboard.error.fetchFailed': 'Pridobivanje stanja ni uspelo: HTTP {{status}}',
  'statusDashboard.label.allOperational': 'Vsi sistemi delujejo',
  'statusDashboard.label.someIssues': 'Nekateri sistemi imajo težave',
  'statusDashboard.label.majorOutage': 'Večja sistemska napaka',
  'statusDashboard.label.operational': 'Deluje',
  'statusDashboard.label.degraded': 'Poslabšano',
  'statusDashboard.label.down': 'Ne deluje',
  'statusDashboard.label.unknown': 'Neznano',
  'statusDashboard.label.services': 'Storitve',
  'statusDashboard.label.incidents': 'Incidenti',
  'statusDashboard.label.uptime': 'Čas delovanja',
  'statusDashboard.label.lastChecked': 'Nazadnje preverjeno {{time}}',
  'statusDashboard.label.latency': '{{ms}}ms',
  'statusDashboard.label.noIncidents': 'Noben incident ni bil prijavljen.',
}
