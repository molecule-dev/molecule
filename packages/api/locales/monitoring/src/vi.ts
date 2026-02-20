import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Vietnamese. */
export const vi: MonitoringTranslations = {
  'monitoring.error.noProvider':
    'Nhà cung cấp giám sát chưa được cấu hình. Gọi setProvider() trước.',
  'monitoring.check.database.notBonded': 'Liên kết cơ sở dữ liệu chưa được cấu hình.',
  'monitoring.check.database.poolUnavailable': 'Pool cơ sở dữ liệu không khả dụng.',
  'monitoring.check.cache.notBonded': 'Liên kết bộ nhớ đệm chưa được cấu hình.',
  'monitoring.check.cache.providerUnavailable': 'Nhà cung cấp bộ nhớ đệm không khả dụng.',
  'monitoring.check.http.badStatus': 'Phản hồi HTTP {{status}}.',
  'monitoring.check.http.timeout': 'Yêu cầu đã hết thời gian.',
  'monitoring.check.http.degraded':
    'Thời gian phản hồi {{latencyMs}}ms vượt ngưỡng {{thresholdMs}}ms.',
  'monitoring.check.bond.notBonded': "Liên kết '{{bondType}}' chưa được đăng ký.",
  'monitoring.check.timedOut': 'Kiểm tra hết thời gian sau {{timeoutMs}}ms.',
}
