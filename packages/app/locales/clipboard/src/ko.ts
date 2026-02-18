import type { ClipboardTranslations } from './types.js'

/** Clipboard translations for Korean. */
export const ko: ClipboardTranslations = {
  'clipboard.error.noProvider':
    '@molecule/app-clipboard: 프로바이더가 설정되지 않았습니다. ClipboardProvider 구현으로 setProvider()를 호출하세요 (예: @molecule/app-clipboard-capacitor에서).',
  'clipboard.warn.onChangeNotSupported':
    '@molecule/app-clipboard: onChange는 프로바이더에서 지원되지 않습니다',
}
