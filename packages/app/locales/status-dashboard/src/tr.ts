import type { StatusDashboardTranslations } from './types.js'

/** Status dashboard translations for Turkish. */
export const tr: StatusDashboardTranslations = {
  'statusDashboard.error.noProvider': 'Durum panosu sağlayıcısı yapılandırılmamış.',
  'statusDashboard.error.fetchFailed': 'Durum alınamadı: HTTP {{status}}',
  'statusDashboard.label.allOperational': 'Tüm sistemler çalışıyor',
  'statusDashboard.label.someIssues': 'Bazı sistemlerde sorunlar yaşanıyor',
  'statusDashboard.label.majorOutage': 'Büyük sistem kesintisi',
  'statusDashboard.label.operational': 'Çalışıyor',
  'statusDashboard.label.degraded': 'Düşük performans',
  'statusDashboard.label.down': 'Çalışmıyor',
  'statusDashboard.label.unknown': 'Bilinmiyor',
  'statusDashboard.label.services': 'Hizmetler',
  'statusDashboard.label.incidents': 'Olaylar',
  'statusDashboard.label.uptime': 'Çalışma süresi',
  'statusDashboard.label.lastChecked': 'Son kontrol {{time}}',
  'statusDashboard.label.latency': '{{ms}}ms',
  'statusDashboard.label.noIncidents': 'Bildirilen olay bulunmuyor.',
}
