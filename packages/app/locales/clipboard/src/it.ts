import type { ClipboardTranslations } from './types.js'

/** Clipboard translations for Italian. */
export const it: ClipboardTranslations = {
  'clipboard.error.noProvider':
    "@molecule/app-clipboard: Nessun provider impostato. Chiama setProvider() con un'implementazione di ClipboardProvider (ad es., da @molecule/app-clipboard-capacitor).",
  'clipboard.warn.onChangeNotSupported':
    '@molecule/app-clipboard: onChange non è supportato dal provider',
}
