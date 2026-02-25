import type { StatusDashboardTranslations } from './types.js'

/** Status dashboard translations for Belarusian. */
export const be: StatusDashboardTranslations = {
  'statusDashboard.error.noProvider': 'Пастаўшчык панэлі стану не наладжаны.',
  'statusDashboard.error.fetchFailed': 'Не ўдалося атрымаць статус: HTTP {{status}}',
  'statusDashboard.label.allOperational': 'Усе сістэмы працуюць',
  'statusDashboard.label.someIssues': 'Некаторыя сістэмы маюць праблемы',
  'statusDashboard.label.majorOutage': "Сур'ёзны збой сістэмы",
  'statusDashboard.label.operational': 'Працуе',
  'statusDashboard.label.degraded': 'Пагоршана',
  'statusDashboard.label.down': 'Не працуе',
  'statusDashboard.label.unknown': 'Невядома',
  'statusDashboard.label.services': 'Сэрвісы',
  'statusDashboard.label.incidents': 'Інцыдэнты',
  'statusDashboard.label.uptime': 'Час працы',
  'statusDashboard.label.lastChecked': 'Апошняя праверка {{time}}',
  'statusDashboard.label.latency': '{{ms}}ms',
  'statusDashboard.label.noIncidents': 'Інцыдэнтаў не зафіксавана.',
}
