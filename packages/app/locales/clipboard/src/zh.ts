import type { ClipboardTranslations } from './types.js'

/** Clipboard translations for Chinese. */
export const zh: ClipboardTranslations = {
  'clipboard.error.noProvider':
    '@molecule/app-clipboard: 未设置提供程序。请使用 ClipboardProvider 实现调用 setProvider()（例如，来自 @molecule/app-clipboard-capacitor）。',
  'clipboard.warn.onChangeNotSupported': '@molecule/app-clipboard: onChange 不受提供程序支持',
}
