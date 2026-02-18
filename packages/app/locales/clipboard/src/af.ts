import type { ClipboardTranslations } from './types.js'

/** Clipboard translations for Afrikaans. */
export const af: ClipboardTranslations = {
  'clipboard.error.noProvider':
    "@molecule/app-clipboard: Geen verskaffer gestel nie. Roep setProvider() met 'n ClipboardProvider-implementering (bv. van @molecule/app-clipboard-capacitor).",
  'clipboard.warn.onChangeNotSupported':
    '@molecule/app-clipboard: onChange word nie deur die verskaffer ondersteun nie',
}
