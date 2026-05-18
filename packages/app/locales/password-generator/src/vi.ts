import type { PasswordGeneratorTranslations } from './types.js'

/** PasswordGenerator translations for vi. */
export const vi: Partial<PasswordGeneratorTranslations> = {
  'password-generator.readoutLabel': 'Mật khẩu được tạo',
  'password-generator.copy': 'Sao chép',
  'password-generator.copied': 'Đã sao chép!',
  'password-generator.regenerate': 'Tạo lại',
  'password-generator.length': 'Chiều dài:<x> {{chiều dài}}</x>',
  'password-generator.lengthLabel': 'Độ dài mật khẩu',
  'password-generator.toggle.uppercase': 'Chữ in hoa (AZ)',
  'password-generator.toggle.lowercase': 'Chữ thường (az)',
  'password-generator.toggle.digits': 'Chữ số (0-9)',
  'password-generator.toggle.symbols': 'Các ký hiệu (!@#…)',
  'password-generator.toggle.noSimilar': 'Bỏ qua các mục tương tự (0/O/1/l/I)',
  'password-generator.toggle.noAmbiguous':
    'Bỏ qua các từ ngữ không rõ ràng (khoảng trắng, dấu ngoặc kép)',
  'password-generator.pick': 'Sử dụng mật khẩu này',
}
