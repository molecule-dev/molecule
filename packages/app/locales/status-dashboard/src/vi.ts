import type { StatusDashboardTranslations } from './types.js'

/** Status dashboard translations for Vietnamese. */
export const vi: StatusDashboardTranslations = {
  'statusDashboard.error.noProvider': 'Nhà cung cấp bảng trạng thái chưa được cấu hình.',
  'statusDashboard.error.fetchFailed': 'Không thể lấy trạng thái: HTTP {{status}}',
  'statusDashboard.label.allOperational': 'Tất cả hệ thống hoạt động bình thường',
  'statusDashboard.label.someIssues': 'Một số hệ thống đang gặp sự cố',
  'statusDashboard.label.majorOutage': 'Sự cố hệ thống nghiêm trọng',
  'statusDashboard.label.operational': 'Hoạt động',
  'statusDashboard.label.degraded': 'Suy giảm',
  'statusDashboard.label.down': 'Ngừng hoạt động',
  'statusDashboard.label.unknown': 'Không xác định',
  'statusDashboard.label.services': 'Dịch vụ',
  'statusDashboard.label.incidents': 'Sự cố',
  'statusDashboard.label.uptime': 'Thời gian hoạt động',
  'statusDashboard.label.lastChecked': 'Kiểm tra lần cuối {{time}}',
  'statusDashboard.label.latency': '{{ms}}ms',
  'statusDashboard.label.noIncidents': 'Không có sự cố nào được báo cáo.',
}
