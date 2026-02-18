import type { ClipboardTranslations } from './types.js'

/** Clipboard translations for Czech. */
export const cs: ClipboardTranslations = {
  'clipboard.error.noProvider':
    '@molecule/app-clipboard: Poskytovatel není nastaven. Zavolejte setProvider() s implementací ClipboardProvider (např. z @molecule/app-clipboard-capacitor).',
  'clipboard.warn.onChangeNotSupported':
    '@molecule/app-clipboard: onChange není poskytovatelem podporován',
}
