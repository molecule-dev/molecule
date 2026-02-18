import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for Vietnamese. */
export const vi: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    'Thiếu tên gói Google Play (process.env.GOOGLE_PLAY_PACKAGE_NAME).',
  'payments.google.warn.missingServiceKey':
    'Thiếu đối tượng khóa dịch vụ Google API (process.env.GOOGLE_API_SERVICE_KEY_OBJECT).',
  'payments.google.error.serviceKeyNotConfigured':
    'Đối tượng khóa dịch vụ Google API chưa được cấu hình',
  'payments.google.error.parseServiceKey': 'Lỗi phân tích đối tượng khóa dịch vụ Google API:',
}
