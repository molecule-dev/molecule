import type { StatusDashboardTranslations } from './types.js'

/** Status dashboard translations for Malay. */
export const ms: StatusDashboardTranslations = {
  'statusDashboard.error.noProvider': 'Penyedia papan pemuka status tidak dikonfigurasikan.',
  'statusDashboard.error.fetchFailed': 'Gagal mendapatkan status: HTTP {{status}}',
  'statusDashboard.label.allOperational': 'Semua sistem beroperasi normal',
  'statusDashboard.label.someIssues': 'Beberapa sistem mengalami masalah',
  'statusDashboard.label.majorOutage': 'Gangguan sistem besar',
  'statusDashboard.label.operational': 'Beroperasi',
  'statusDashboard.label.degraded': 'Merosot',
  'statusDashboard.label.down': 'Tidak aktif',
  'statusDashboard.label.unknown': 'Tidak diketahui',
  'statusDashboard.label.services': 'Perkhidmatan',
  'statusDashboard.label.incidents': 'Insiden',
  'statusDashboard.label.uptime': 'Masa aktif',
  'statusDashboard.label.lastChecked': 'Terakhir disemak {{time}}',
  'statusDashboard.label.latency': '{{ms}}ms',
  'statusDashboard.label.noIncidents': 'Tiada insiden dilaporkan.',
}
