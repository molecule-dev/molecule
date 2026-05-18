import type { StatusDashboardTranslations } from './types.js'

/** StatusDashboard translations for fil. */
export const fil: Partial<StatusDashboardTranslations> = {
  'statusDashboard.label.degraded': 'Bumaba',
  'statusDashboard.label.down': 'Hindi available',
  'statusDashboard.label.services': 'Mga serbisyo',
  'statusDashboard.error.noProvider': 'Hindi na-configure ang provider ng status dashboard.',
  'statusDashboard.error.fetchFailed': 'Nabigong makuha ang katayuan: HTTP<x> {{katayuan}}</x>',
  'statusDashboard.label.allOperational': 'Lahat ng Sistema ay Operasyonal',
  'statusDashboard.label.someIssues': 'Ang Ilang Sistema ay Nakakaranas ng mga Problema',
  'statusDashboard.label.majorOutage': 'Malaking Pagkawala ng Sistema',
  'statusDashboard.label.operational': 'Operasyonal',
  'statusDashboard.label.unknown': 'Hindi Kilala',
  'statusDashboard.label.incidents': 'Mga Insidente',
  'statusDashboard.label.uptime': 'Oras ng paggamit',
  'statusDashboard.label.lastChecked': 'Huling nasuri<x> {{oras}}</x>',
  'statusDashboard.label.latency': '{{MS}} MS',
  'statusDashboard.label.noIncidents': 'Walang naiulat na insidente.',
}
