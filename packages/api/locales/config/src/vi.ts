import type { ConfigTranslations } from './types.js'

/** Config translations for Vietnamese. */
export const vi: ConfigTranslations = {
  'config.error.required': "Cấu hình bắt buộc '{{key}}' chưa được thiết lập.",
  'config.error.mustBeNumber': "Cấu hình '{{key}}' phải là một số.",
  'config.error.minValue': "Cấu hình '{{key}}' phải ít nhất là {{min}}.",
  'config.error.maxValue': "Cấu hình '{{key}}' phải nhiều nhất là {{max}}.",
  'config.error.mustBeBoolean': "Cấu hình '{{key}}' phải là giá trị boolean (true/false/1/0).",
  'config.error.mustBeJson': "Cấu hình '{{key}}' phải là JSON hợp lệ.",
  'config.error.patternMismatch': "Cấu hình '{{key}}' không khớp với mẫu '{{pattern}}'.",
  'config.error.invalidEnum': "Cấu hình '{{key}}' phải là một trong: {{values}}.",
  'config.error.validationNotSupported': 'Nhà cung cấp cấu hình hiện tại không hỗ trợ xác thực.',
}
