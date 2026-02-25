import type { StatusDashboardTranslations } from './types.js'

/** Status dashboard translations for Lithuanian. */
export const lt: StatusDashboardTranslations = {
  'statusDashboard.error.noProvider': 'Būsenos skydelio teikėjas nesukonfigūruotas.',
  'statusDashboard.error.fetchFailed': 'Nepavyko gauti būsenos: HTTP {{status}}',
  'statusDashboard.label.allOperational': 'Visos sistemos veikia',
  'statusDashboard.label.someIssues': 'Kai kuriose sistemose kilo problemų',
  'statusDashboard.label.majorOutage': 'Didelis sistemos gedimas',
  'statusDashboard.label.operational': 'Veikia',
  'statusDashboard.label.degraded': 'Pablogėjęs',
  'statusDashboard.label.down': 'Neveikia',
  'statusDashboard.label.unknown': 'Nežinoma',
  'statusDashboard.label.services': 'Paslaugos',
  'statusDashboard.label.incidents': 'Incidentai',
  'statusDashboard.label.uptime': 'Veikimo laikas',
  'statusDashboard.label.lastChecked': 'Paskutinį kartą tikrinta {{time}}',
  'statusDashboard.label.latency': '{{ms}}ms',
  'statusDashboard.label.noIncidents': 'Incidentų nepranešta.',
}
