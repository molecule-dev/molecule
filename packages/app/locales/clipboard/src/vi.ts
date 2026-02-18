import type { ClipboardTranslations } from './types.js'

/** Clipboard translations for Vietnamese. */
export const vi: ClipboardTranslations = {
  'clipboard.error.noProvider':
    '@molecule/app-clipboard: Chưa thiết lập nhà cung cấp. Gọi setProvider() với triển khai ClipboardProvider (ví dụ, từ @molecule/app-clipboard-capacitor).',
  'clipboard.warn.onChangeNotSupported':
    '@molecule/app-clipboard: onChange không được nhà cung cấp hỗ trợ',
}
