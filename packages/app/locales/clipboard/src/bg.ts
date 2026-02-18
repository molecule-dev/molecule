import type { ClipboardTranslations } from './types.js'

/** Clipboard translations for Bulgarian. */
export const bg: ClipboardTranslations = {
  'clipboard.error.noProvider':
    '@molecule/app-clipboard: Не е зададен доставчик. Извикайте setProvider() с имплементация на ClipboardProvider (напр. от @molecule/app-clipboard-capacitor).',
  'clipboard.warn.onChangeNotSupported':
    '@molecule/app-clipboard: onChange не се поддържа от доставчика',
}
