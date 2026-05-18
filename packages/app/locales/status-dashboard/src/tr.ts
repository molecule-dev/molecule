import type { StatusDashboardTranslations } from './types.js'

/** StatusDashboard translations for tr. */
export const tr: Partial<StatusDashboardTranslations> = {
  'statusDashboard.label.operational': 'Çalışıyor',
  'statusDashboard.label.degraded': 'Düşük performanslı',
  'statusDashboard.label.down': 'Çevrimdışı',
  'statusDashboard.label.unknown': 'Bilinmiyor',
  'statusDashboard.label.services': 'Hizmetler',
  'statusDashboard.label.incidents': 'Olaylar',
  'statusDashboard.label.uptime': 'Çalışma süresi',
  'statusDashboard.error.noProvider': 'Durum kontrol paneli sağlayıcısı yapılandırılmamış.',
  'statusDashboard.error.fetchFailed': 'HTTP durumunu alma işlemi başarısız oldu.<x> {{durum}}</x>',
  'statusDashboard.label.allOperational': 'Tüm Sistemler Çalışır Durumda',
  'statusDashboard.label.someIssues': 'Bazı sistemlerde sorunlar yaşanıyor.',
  'statusDashboard.label.majorOutage': 'Büyük Sistem Kesintisi',
  'statusDashboard.label.lastChecked': 'Son kontrol<x> {{zaman}}</x>',
  'statusDashboard.label.latency': '{{ms}} Bayan',
  'statusDashboard.label.noIncidents': 'Herhangi bir olay bildirilmedi.',
}
