import type { ClipboardTranslations } from './types.js'

/** Clipboard translations for Polish. */
export const pl: ClipboardTranslations = {
  'clipboard.error.noProvider':
    '@molecule/app-clipboard: Nie ustawiono dostawcy. Wywołaj setProvider() z implementacją ClipboardProvider (np. z @molecule/app-clipboard-capacitor).',
  'clipboard.warn.onChangeNotSupported':
    '@molecule/app-clipboard: onChange nie jest obsługiwany przez dostawcę',
}
