import type { ClipboardTranslations } from './types.js'

/** Clipboard translations for Ukrainian. */
export const uk: ClipboardTranslations = {
  'clipboard.error.noProvider':
    '@molecule/app-clipboard: Провайдер не встановлено. Викличте setProvider() з реалізацією ClipboardProvider (напр., з @molecule/app-clipboard-react-native).',
  'clipboard.warn.onChangeNotSupported':
    '@molecule/app-clipboard: onChange не підтримується провайдером',
}
