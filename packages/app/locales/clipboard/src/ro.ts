import type { ClipboardTranslations } from './types.js'

/** Clipboard translations for Romanian. */
export const ro: ClipboardTranslations = {
  'clipboard.error.noProvider':
    '@molecule/app-clipboard: Niciun furnizor setat. Apelați setProvider() cu o implementare ClipboardProvider (de ex., din @molecule/app-clipboard-capacitor).',
  'clipboard.warn.onChangeNotSupported':
    '@molecule/app-clipboard: onChange nu este suportat de furnizor',
}
