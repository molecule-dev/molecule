import type { ClipboardTranslations } from './types.js'

/** Clipboard translations for Chinese (Traditional). */
export const zhTW: ClipboardTranslations = {
  'clipboard.error.noProvider':
    '@molecule/app-clipboard: 未設定提供者。請使用 ClipboardProvider 實作呼叫 setProvider()（例如，來自 @molecule/app-clipboard-react-native）。',
  'clipboard.warn.onChangeNotSupported': '@molecule/app-clipboard: onChange 不受提供者支援',
  'clipboard.error.missingDependency':
    '`{{library}}`是必要的，但尚未安裝。請使用以下指令安裝：`npm install {{library}}`',
}
