import type { ClipboardTranslations } from './types.js'

/** Clipboard translations for Indonesian. */
export const id: ClipboardTranslations = {
  'clipboard.error.noProvider':
    '@molecule/app-clipboard: Penyedia belum diatur. Panggil setProvider() dengan implementasi ClipboardProvider (mis., dari @molecule/app-clipboard-capacitor).',
  'clipboard.warn.onChangeNotSupported':
    '@molecule/app-clipboard: onChange tidak didukung oleh penyedia',
}
