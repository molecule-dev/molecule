import type { ClipboardTranslations } from './types.js'

/** Clipboard translations for Vietnamese. */
export const vi: ClipboardTranslations = {
  'clipboard.error.noProvider':
    '@molecule/app-clipboard: Chưa thiết lập nhà cung cấp. Gọi setProvider() với triển khai ClipboardProvider (ví dụ, từ @molecule/app-clipboard-react-native).',
  'clipboard.warn.onChangeNotSupported':
    '@molecule/app-clipboard: onChange không được nhà cung cấp hỗ trợ',
  'clipboard.error.missingDependency':
    '`{{library}}` là thư viện cần thiết nhưng chưa được cài đặt. Hãy cài đặt nó bằng lệnh: `npm install {{library}}`',
}
