import type { StatusDashboardTranslations } from './types.js'

/** StatusDashboard translations for id. */
export const id: Partial<StatusDashboardTranslations> = {
  'statusDashboard.label.operational': 'Operasional',
  'statusDashboard.label.degraded': 'Menurun',
  'statusDashboard.label.down': 'Mati',
  'statusDashboard.label.unknown': 'Tidak diketahui',
  'statusDashboard.label.services': 'Layanan',
  'statusDashboard.label.incidents': 'Insiden',
  'statusDashboard.label.uptime': 'Waktu aktif',
  'statusDashboard.error.noProvider': 'Penyedia dasbor status belum dikonfigurasi.',
  'statusDashboard.error.fetchFailed': 'Gagal mengambil status: HTTP<x> {{status}}</x>',
  'statusDashboard.label.allOperational': 'Semua Sistem Beroperasi',
  'statusDashboard.label.someIssues': 'Beberapa Sistem Mengalami Masalah',
  'statusDashboard.label.majorOutage': 'Gangguan Sistem Utama',
  'statusDashboard.label.lastChecked': 'Terakhir diperiksa<x> {{waktu}}</x>',
  'statusDashboard.label.latency': '{{MS}} MS',
  'statusDashboard.label.noIncidents': 'Tidak ada insiden yang dilaporkan.',
}
