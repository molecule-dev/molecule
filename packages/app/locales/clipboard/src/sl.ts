import type { ClipboardTranslations } from './types.js'

/** Clipboard translations for Slovenian. */
export const sl: ClipboardTranslations = {
  'clipboard.error.noProvider':
    '@molecule/app-clipboard: Ponudnik ni nastavljen. Pokličite setProvider() z implementacijo ClipboardProvider (npr. iz @molecule/app-clipboard-react-native).',
  'clipboard.warn.onChangeNotSupported':
    '@molecule/app-clipboard: onChange ni podprt s strani ponudnika',
}
