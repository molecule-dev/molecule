import type { StatusDashboardTranslations } from './types.js'

/** Status dashboard translations for Icelandic. */
export const is: StatusDashboardTranslations = {
  'statusDashboard.error.noProvider': 'Stöðuyfirlit veitandi er ekki stilltur.',
  'statusDashboard.error.fetchFailed': 'Ekki tókst að sækja stöðu: HTTP {{status}}',
  'statusDashboard.label.allOperational': 'Öll kerfi eru í gangi',
  'statusDashboard.label.someIssues': 'Sum kerfi eru að lenda í vandræðum',
  'statusDashboard.label.majorOutage': 'Stórt kerfisstöðvun',
  'statusDashboard.label.operational': 'Í gangi',
  'statusDashboard.label.degraded': 'Skert',
  'statusDashboard.label.down': 'Niðri',
  'statusDashboard.label.unknown': 'Óþekkt',
  'statusDashboard.label.services': 'Þjónustur',
  'statusDashboard.label.incidents': 'Atvik',
  'statusDashboard.label.uptime': 'Gangtími',
  'statusDashboard.label.lastChecked': 'Síðast athugað {{time}}',
  'statusDashboard.label.latency': '{{ms}}ms',
  'statusDashboard.label.noIncidents': 'Engin atvik tilkynnt.',
}
