import type { ClipboardTranslations } from './types.js'

/** Clipboard translations for Norwegian Bokmål. */
export const nb: ClipboardTranslations = {
  'clipboard.error.noProvider':
    '@molecule/app-clipboard: Ingen leverandør er satt. Kall setProvider() med en ClipboardProvider-implementasjon (f.eks. fra @molecule/app-clipboard-capacitor).',
  'clipboard.warn.onChangeNotSupported':
    '@molecule/app-clipboard: onChange støttes ikke av leverandøren',
}
