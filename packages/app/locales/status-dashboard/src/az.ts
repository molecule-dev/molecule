import type { StatusDashboardTranslations } from './types.js'

/** Status dashboard translations for Azerbaijani. */
export const az: StatusDashboardTranslations = {
  'statusDashboard.error.noProvider': 'Status paneli provayderi konfiqurasiya edilməyib.',
  'statusDashboard.error.fetchFailed': 'Statusu əldə etmək mümkün olmadı: HTTP {{status}}',
  'statusDashboard.label.allOperational': 'Bütün sistemlər işləyir',
  'statusDashboard.label.someIssues': 'Bəzi sistemlərdə problemlər var',
  'statusDashboard.label.majorOutage': 'Böyük sistem kəsintisi',
  'statusDashboard.label.operational': 'İşləyir',
  'statusDashboard.label.degraded': 'Zəifləyib',
  'statusDashboard.label.down': 'İşləmir',
  'statusDashboard.label.unknown': 'Naməlum',
  'statusDashboard.label.services': 'Xidmətlər',
  'statusDashboard.label.incidents': 'Hadisələr',
  'statusDashboard.label.uptime': 'İş vaxtı',
  'statusDashboard.label.lastChecked': 'Son yoxlama {{time}}',
  'statusDashboard.label.latency': '{{ms}}ms',
  'statusDashboard.label.noIncidents': 'Heç bir hadisə bildirilməyib.',
}
