import type { StatusDashboardTranslations } from './types.js'

/** StatusDashboard translations for ms. */
export const ms: Partial<StatusDashboardTranslations> = {
  'statusDashboard.label.degraded': 'Merosot',
  'statusDashboard.label.down': 'Tidak tersedia',
  'statusDashboard.label.services': 'Perkhidmatan',
  'statusDashboard.label.uptime': 'Masa operasi',
  'statusDashboard.error.noProvider': 'Pembekal papan pemuka status tidak dikonfigurasikan.',
  'statusDashboard.error.fetchFailed': 'Gagal mengambil status: HTTP<x> {{status}}</x>',
  'statusDashboard.label.allOperational': 'Semua Sistem Operasi',
  'statusDashboard.label.someIssues': 'Sesetengah Sistem Mengalami Masalah',
  'statusDashboard.label.majorOutage': 'Gangguan Sistem Utama',
  'statusDashboard.label.operational': 'Operasi',
  'statusDashboard.label.unknown': 'Tidak diketahui',
  'statusDashboard.label.incidents': 'Insiden',
  'statusDashboard.label.lastChecked': 'Semakan terakhir<x> {{masa}}</x>',
  'statusDashboard.label.latency': '{{ms}} ms',
  'statusDashboard.label.noIncidents': 'Tiada insiden yang dilaporkan.',
}
