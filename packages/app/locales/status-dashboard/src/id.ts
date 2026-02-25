import type { StatusDashboardTranslations } from './types.js'

/** Status dashboard translations for Indonesian. */
export const id: StatusDashboardTranslations = {
  'statusDashboard.error.noProvider': 'Penyedia dasbor status belum dikonfigurasi.',
  'statusDashboard.error.fetchFailed': 'Gagal mengambil status: HTTP {{status}}',
  'statusDashboard.label.allOperational': 'Semua sistem beroperasi normal',
  'statusDashboard.label.someIssues': 'Beberapa sistem mengalami masalah',
  'statusDashboard.label.majorOutage': 'Gangguan sistem besar',
  'statusDashboard.label.operational': 'Beroperasi',
  'statusDashboard.label.degraded': 'Menurun',
  'statusDashboard.label.down': 'Tidak aktif',
  'statusDashboard.label.unknown': 'Tidak diketahui',
  'statusDashboard.label.services': 'Layanan',
  'statusDashboard.label.incidents': 'Insiden',
  'statusDashboard.label.uptime': 'Waktu aktif',
  'statusDashboard.label.lastChecked': 'Terakhir diperiksa {{time}}',
  'statusDashboard.label.latency': '{{ms}}ms',
  'statusDashboard.label.noIncidents': 'Tidak ada insiden yang dilaporkan.',
}
