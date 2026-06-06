import type { ClipboardTranslations } from './types.js'

/** Clipboard translations for it. */
export const it: Partial<ClipboardTranslations> = {
  'clipboard.warn.onChangeNotSupported':
    '@molecule/app-clipboard: onChange non è supportato dal provider',
  'clipboard.error.noProvider':
    "@molecule/app-clipboard: Nessun provider impostato. Chiama setProvider() con un'implementazione di ClipboardProvider (ad esempio, da @molecule/app-clipboard-capacitor).",
}
