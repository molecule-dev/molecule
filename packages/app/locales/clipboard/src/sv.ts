import type { ClipboardTranslations } from './types.js'

/** Clipboard translations for Swedish. */
export const sv: ClipboardTranslations = {
  'clipboard.error.noProvider':
    '@molecule/app-clipboard: Ingen leverantör har angetts. Anropa setProvider() med en ClipboardProvider-implementering (t.ex. från @molecule/app-clipboard-capacitor).',
  'clipboard.warn.onChangeNotSupported':
    '@molecule/app-clipboard: onChange stöds inte av leverantören',
}
