import type { StatusDashboardTranslations } from './types.js'

/** Status dashboard translations for Maltese. */
export const mt: StatusDashboardTranslations = {
  'statusDashboard.error.noProvider': 'Il-fornitur tad-dashboard tal-istatus mhuwiex ikkonfigurat.',
  'statusDashboard.error.fetchFailed': 'Ma rnexxielekx tikseb l-istatus: HTTP {{status}}',
  'statusDashboard.label.allOperational': 'Is-sistemi kollha qed jahdmu',
  'statusDashboard.label.someIssues': 'Xi sistemi qed jesperjenzaw problemi',
  'statusDashboard.label.majorOutage': 'Waqfien kbir tas-sistema',
  'statusDashboard.label.operational': 'Qed jahdem',
  'statusDashboard.label.degraded': 'Degradat',
  'statusDashboard.label.down': 'Mhux jahdem',
  'statusDashboard.label.unknown': 'Mhux maghruf',
  'statusDashboard.label.services': 'Servizzi',
  'statusDashboard.label.incidents': 'Incidenti',
  'statusDashboard.label.uptime': 'Hin tat-thadim',
  'statusDashboard.label.lastChecked': 'L-ahhar iccekjat {{time}}',
  'statusDashboard.label.latency': '{{ms}}ms',
  'statusDashboard.label.noIncidents': 'L-ebda incident irrappurtat.',
}
