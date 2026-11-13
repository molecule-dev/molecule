import type { HealthTranslations } from './types.js'

/** Health translations for vi. */
export const vi: Partial<HealthTranslations> = {
  'health.durationMinutes': '{{minutes}}p',
  'health.durationHoursMinutes': '{{hours}} h {{minutes}} m',
  'health.error.noProvider':
    '`@molecule/app-health`: Không có nhà cung cấp sức khỏe nào được liên kết — hãy triển khai giao diện `HealthProvider` trên môi trường chạy gốc của bạn (Apple HealthKit / Android Health Connect / Google Fit) và liên kết nó với `setProvider()` khi khởi động. Không có nhà cung cấp nào được tích hợp sẵn. Hãy kiểm tra tính năng bằng `hasProvider()` hoặc `getCapabilities().supported` trước khi gọi — việc đọc dữ liệu sức khỏe không có giá trị mặc định trung thực, vì vậy điều này sẽ gây ra lỗi thay vì trả về dữ liệu giả.',
}
