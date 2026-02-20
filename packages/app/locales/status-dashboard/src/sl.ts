import type { StatusDashboardTranslations } from './types.js'

/** Status dashboard translations for Slovenian. */
export const sl: StatusDashboardTranslations = {
  'statusDashboard.error.noProvider': 'Status dashboard provider not configured.',
  'statusDashboard.error.fetchFailed': 'Failed to fetch status: HTTP {{status}}',
  'statusDashboard.label.allOperational': 'All Systems Operational',
  'statusDashboard.label.someIssues': 'Some Systems Experiencing Issues',
  'statusDashboard.label.majorOutage': 'Major System Outage',
  'statusDashboard.label.operational': 'Operational',
  'statusDashboard.label.degraded': 'Degraded',
  'statusDashboard.label.down': 'Down',
  'statusDashboard.label.unknown': 'Unknown',
  'statusDashboard.label.services': 'Services',
  'statusDashboard.label.incidents': 'Incidents',
  'statusDashboard.label.uptime': 'Uptime',
  'statusDashboard.label.lastChecked': 'Last checked {{time}}',
  'statusDashboard.label.latency': '{{ms}}ms',
  'statusDashboard.label.noIncidents': 'No incidents reported.',
}
