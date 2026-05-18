import type { StatusDashboardTranslations } from './types.js'

/** StatusDashboard translations for vi. */
export const vi: Partial<StatusDashboardTranslations> = {
  'statusDashboard.label.operational': 'Hoạt động',
  'statusDashboard.label.degraded': 'Suy giảm',
  'statusDashboard.label.down': 'Ngưng hoạt động',
  'statusDashboard.label.unknown': 'Không xác định',
  'statusDashboard.label.services': 'Dịch vụ',
  'statusDashboard.label.incidents': 'Sự cố',
  'statusDashboard.label.uptime': 'Thời gian hoạt động',
  'statusDashboard.error.noProvider': 'Nhà cung cấp bảng điều khiển trạng thái chưa được cấu hình.',
  'statusDashboard.error.fetchFailed': 'Không thể lấy trạng thái: HTTP<x> {{trạng thái}}</x>',
  'statusDashboard.label.allOperational': 'Tất cả các hệ thống đều đang hoạt động.',
  'statusDashboard.label.someIssues': 'Một số hệ thống đang gặp sự cố.',
  'statusDashboard.label.majorOutage': 'Sự cố mất điện hệ thống quy mô lớn',
  'statusDashboard.label.lastChecked': 'Lần kiểm tra cuối cùng<x> {{thời gian}}</x>',
  'statusDashboard.label.latency': '{{bệnh đa xơ cứng}} bệnh đa xơ cứng',
  'statusDashboard.label.noIncidents': 'Không có sự cố nào được báo cáo.',
}
