import type { StatusDashboardTranslations } from './types.js'

/** StatusDashboard translations for fi. */
export const fi: Partial<StatusDashboardTranslations> = {
  'statusDashboard.label.degraded': 'Heikentynyt',
  'statusDashboard.label.down': 'Alhaalla',
  'statusDashboard.label.services': 'Palvelut',
  'statusDashboard.label.uptime': 'Käyttöaika',
  'statusDashboard.error.noProvider': 'Tilanäkymän tarjoajaa ei ole määritetty.',
  'statusDashboard.error.fetchFailed': 'Tilan hakeminen epäonnistui: HTTP {{status}}',
  'statusDashboard.label.allOperational': 'Kaikki järjestelmät toiminnassa',
  'statusDashboard.label.someIssues': 'Joissakin järjestelmissä on ongelmia',
  'statusDashboard.label.majorOutage': 'Merkittävä järjestelmäkatkos',
  'statusDashboard.label.operational': 'Toiminnallinen',
  'statusDashboard.label.unknown': 'Tuntematon',
  'statusDashboard.label.incidents': 'Tapahtumat',
  'statusDashboard.label.lastChecked': 'Viimeksi tarkistettu {{time}}',
  'statusDashboard.label.latency': '{{ms}} neiti',
  'statusDashboard.label.noIncidents': 'Ei raportoituja tapauksia.',
}
