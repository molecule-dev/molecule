import type { IconsTranslations } from './types.js'

/** Icons translations for Vietnamese. */
export const vi: IconsTranslations = {
  'icons.error.noIconSet':
    'Chưa thiết lập IconSet nào. Gọi setIconSet() khi khởi động ứng dụng với thư viện biểu tượng (ví dụ: @molecule/app-icons-molecule).',
  'icons.error.noProvider':
    '@molecule/app-icons: Chưa kết nối bộ biểu tượng nào. Gọi setIconSet() với một IconSet (ví dụ: giá trị export từ @molecule/app-icons-molecule).',
  'icons.error.notFound': 'Không tìm thấy biểu tượng "{{name}}" trong bộ biểu tượng hiện tại.',
}
