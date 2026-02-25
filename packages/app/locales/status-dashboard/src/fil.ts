import type { StatusDashboardTranslations } from './types.js'

/** Status dashboard translations for Filipino. */
export const fil: StatusDashboardTranslations = {
  'statusDashboard.error.noProvider': 'Hindi naka-configure ang provider ng status dashboard.',
  'statusDashboard.error.fetchFailed': 'Nabigong kunin ang status: HTTP {{status}}',
  'statusDashboard.label.allOperational': 'Lahat ng sistema ay gumagana',
  'statusDashboard.label.someIssues': 'May mga problema ang ilang sistema',
  'statusDashboard.label.majorOutage': 'Malaking pagkawala ng sistema',
  'statusDashboard.label.operational': 'Gumagana',
  'statusDashboard.label.degraded': 'Bumaba ang kalidad',
  'statusDashboard.label.down': 'Hindi gumagana',
  'statusDashboard.label.unknown': 'Hindi alam',
  'statusDashboard.label.services': 'Mga serbisyo',
  'statusDashboard.label.incidents': 'Mga insidente',
  'statusDashboard.label.uptime': 'Oras ng paggana',
  'statusDashboard.label.lastChecked': 'Huling sinuri {{time}}',
  'statusDashboard.label.latency': '{{ms}}ms',
  'statusDashboard.label.noIncidents': 'Walang naiulat na insidente.',
}
