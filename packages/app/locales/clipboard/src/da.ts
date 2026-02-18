import type { ClipboardTranslations } from './types.js'

/** Clipboard translations for Danish. */
export const da: ClipboardTranslations = {
  'clipboard.error.noProvider':
    '@molecule/app-clipboard: Ingen udbyder angivet. Kald setProvider() med en ClipboardProvider-implementering (f.eks. fra @molecule/app-clipboard-capacitor).',
  'clipboard.warn.onChangeNotSupported':
    '@molecule/app-clipboard: onChange understøttes ikke af udbyderen',
}
