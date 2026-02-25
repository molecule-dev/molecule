import type { StatusDashboardTranslations } from './types.js'

/** Status dashboard translations for Finnish. */
export const fi: StatusDashboardTranslations = {
  'statusDashboard.error.noProvider': 'Tilanäkymän tarjoajaa ei ole määritetty.',
  'statusDashboard.error.fetchFailed': 'Tilan hakeminen epäonnistui: HTTP {{status}}',
  'statusDashboard.label.allOperational': 'Kaikki järjestelmät toimivat',
  'statusDashboard.label.someIssues': 'Joissakin järjestelmissä on ongelmia',
  'statusDashboard.label.majorOutage': 'Suuri järjestelmäkatkos',
  'statusDashboard.label.operational': 'Toiminnassa',
  'statusDashboard.label.degraded': 'Heikentynyt',
  'statusDashboard.label.down': 'Alhaalla',
  'statusDashboard.label.unknown': 'Tuntematon',
  'statusDashboard.label.services': 'Palvelut',
  'statusDashboard.label.incidents': 'Tapahtumat',
  'statusDashboard.label.uptime': 'Käyttöaika',
  'statusDashboard.label.lastChecked': 'Viimeksi tarkistettu {{time}}',
  'statusDashboard.label.latency': '{{ms}}ms',
  'statusDashboard.label.noIncidents': 'Ei raportoituja tapahtumia.',
}
