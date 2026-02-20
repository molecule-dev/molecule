/** Translation keys for the status-dashboard locale package. */
export type StatusDashboardTranslationKey =
  | 'statusDashboard.error.noProvider'
  | 'statusDashboard.error.fetchFailed'
  | 'statusDashboard.label.allOperational'
  | 'statusDashboard.label.someIssues'
  | 'statusDashboard.label.majorOutage'
  | 'statusDashboard.label.operational'
  | 'statusDashboard.label.degraded'
  | 'statusDashboard.label.down'
  | 'statusDashboard.label.unknown'
  | 'statusDashboard.label.services'
  | 'statusDashboard.label.incidents'
  | 'statusDashboard.label.uptime'
  | 'statusDashboard.label.lastChecked'
  | 'statusDashboard.label.latency'
  | 'statusDashboard.label.noIncidents'

/** Translation record mapping status-dashboard keys to translated strings. */
export type StatusDashboardTranslations = Record<StatusDashboardTranslationKey, string>
