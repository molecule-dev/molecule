import type { ClipboardTranslations } from './types.js'

/** Clipboard translations for Serbian. */
export const sr: ClipboardTranslations = {
  'clipboard.error.noProvider':
    '@molecule/app-clipboard: Провајдер није постављен. Позовите setProvider() са имплементацијом ClipboardProvider (нпр., из @molecule/app-clipboard-capacitor).',
  'clipboard.warn.onChangeNotSupported':
    '@molecule/app-clipboard: onChange није подржан од стране провајдера',
}
