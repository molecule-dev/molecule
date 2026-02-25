import type { StatusDashboardTranslations } from './types.js'

/** Status dashboard translations for Latvian. */
export const lv: StatusDashboardTranslations = {
  'statusDashboard.error.noProvider': 'Statusa paneļa nodrošinātājs nav konfigurēts.',
  'statusDashboard.error.fetchFailed': 'Neizdevās iegūt statusu: HTTP {{status}}',
  'statusDashboard.label.allOperational': 'Visas sistēmas darbojas',
  'statusDashboard.label.someIssues': 'Dažām sistēmām ir problēmas',
  'statusDashboard.label.majorOutage': 'Nopietns sistēmas pārtraukums',
  'statusDashboard.label.operational': 'Darbojas',
  'statusDashboard.label.degraded': 'Pasliktināts',
  'statusDashboard.label.down': 'Nedarbojas',
  'statusDashboard.label.unknown': 'Nezināms',
  'statusDashboard.label.services': 'Pakalpojumi',
  'statusDashboard.label.incidents': 'Incidenti',
  'statusDashboard.label.uptime': 'Darbības laiks',
  'statusDashboard.label.lastChecked': 'Pēdējo reizi pārbaudīts {{time}}',
  'statusDashboard.label.latency': '{{ms}}ms',
  'statusDashboard.label.noIncidents': 'Nav ziņots par incidentiem.',
}
