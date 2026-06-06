import type { ClipboardTranslations } from './types.js'

/** Clipboard translations for af. */
export const af: Partial<ClipboardTranslations> = {
  'clipboard.warn.onChangeNotSupported':
    '@molecule/app-clipboard: onChange word nie deur die verskaffer ondersteun nie',
  'clipboard.error.noProvider':
    "@molecule/app-knipbord: Geen verskaffer gestel nie. Roep setProvider() met 'n Klembordverskaffer-implementering (bv. vanaf @molecule/app-knipbord-kondensator).",
}
