import type { ClipboardTranslations } from './types.js'

/** Clipboard translations for Russian. */
export const ru: ClipboardTranslations = {
  'clipboard.error.noProvider':
    '@molecule/app-clipboard: Провайдер не установлен. Вызовите setProvider() с реализацией ClipboardProvider (например, из @molecule/app-clipboard-capacitor).',
  'clipboard.warn.onChangeNotSupported':
    '@molecule/app-clipboard: onChange не поддерживается провайдером',
}
