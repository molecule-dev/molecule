import type { StatusDashboardTranslations } from './types.js'

/** Status dashboard translations for Welsh. */
export const cy: StatusDashboardTranslations = {
  'statusDashboard.error.noProvider': 'Nid yw darparwr dangosfwrdd statws wedi ei ffurfweddu.',
  'statusDashboard.error.fetchFailed': 'Methwyd â nôl y statws: HTTP {{status}}',
  'statusDashboard.label.allOperational': "Mae'r holl systemau yn gweithredu",
  'statusDashboard.label.someIssues': "Mae rhai systemau'n profi problemau",
  'statusDashboard.label.majorOutage': 'Methiant system mawr',
  'statusDashboard.label.operational': 'Yn gweithredu',
  'statusDashboard.label.degraded': 'Dirywiad',
  'statusDashboard.label.down': 'I lawr',
  'statusDashboard.label.unknown': 'Anhysbys',
  'statusDashboard.label.services': 'Gwasanaethau',
  'statusDashboard.label.incidents': 'Digwyddiadau',
  'statusDashboard.label.uptime': 'Amser rhedeg',
  'statusDashboard.label.lastChecked': 'Gwiriwyd ddiwethaf {{time}}',
  'statusDashboard.label.latency': '{{ms}}ms',
  'statusDashboard.label.noIncidents': 'Ni adroddwyd am unrhyw ddigwyddiadau.',
}
