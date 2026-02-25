import type { StatusDashboardTranslations } from './types.js'

/** Status dashboard translations for Croatian. */
export const hr: StatusDashboardTranslations = {
  'statusDashboard.error.noProvider': 'Pružatelj statusne nadzorne ploče nije konfiguriran.',
  'statusDashboard.error.fetchFailed': 'Dohvaćanje statusa nije uspjelo: HTTP {{status}}',
  'statusDashboard.label.allOperational': 'Svi sustavi rade normalno',
  'statusDashboard.label.someIssues': 'Neki sustavi imaju probleme',
  'statusDashboard.label.majorOutage': 'Veliki kvar sustava',
  'statusDashboard.label.operational': 'Radi',
  'statusDashboard.label.degraded': 'Degradirano',
  'statusDashboard.label.down': 'Ne radi',
  'statusDashboard.label.unknown': 'Nepoznato',
  'statusDashboard.label.services': 'Usluge',
  'statusDashboard.label.incidents': 'Incidenti',
  'statusDashboard.label.uptime': 'Vrijeme rada',
  'statusDashboard.label.lastChecked': 'Posljednja provjera {{time}}',
  'statusDashboard.label.latency': '{{ms}}ms',
  'statusDashboard.label.noIncidents': 'Nema prijavljenih incidenata.',
}
