import type { ClipboardTranslations } from './types.js'

/** Clipboard translations for Dutch. */
export const nl: ClipboardTranslations = {
  'clipboard.error.noProvider':
    '@molecule/app-clipboard: Geen provider ingesteld. Roep setProvider() aan met een ClipboardProvider-implementatie (bijv. van @molecule/app-clipboard-capacitor).',
  'clipboard.warn.onChangeNotSupported':
    '@molecule/app-clipboard: onChange wordt niet ondersteund door de provider',
}
