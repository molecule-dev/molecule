import type { StatusDashboardTranslations } from './types.js'

/** Status dashboard translations for Bosnian. */
export const bs: StatusDashboardTranslations = {
  'statusDashboard.error.fetchFailed': 'Nije uspjelo preuzimanje statusa: HTTP {{status}}',
  'statusDashboard.label.allOperational': 'Svi sistemi rade normalno',
  'statusDashboard.label.someIssues': 'Neki sistemi imaju probleme',
  'statusDashboard.label.majorOutage': 'Veliki kvar sistema',
  'statusDashboard.label.operational': 'Radi',
  'statusDashboard.label.degraded': 'Degradirano',
  'statusDashboard.label.down': 'Ne radi',
  'statusDashboard.label.unknown': 'Nepoznato',
  'statusDashboard.label.services': 'Servisi',
  'statusDashboard.label.incidents': 'Incidenti',
  'statusDashboard.label.uptime': 'Vrijeme rada',
  'statusDashboard.label.lastChecked': 'Posljednja provjera {{time}}',
  'statusDashboard.label.latency': '{{ms}}ms',
  'statusDashboard.label.noIncidents': 'Nema prijavljenih incidenata.',
  'statusDashboard.error.noProvider':
    'Pružatelj kontrolne ploče statusa nije konfiguriran. Prvo povežite pružatelja kontrolne ploče statusa.',
}
