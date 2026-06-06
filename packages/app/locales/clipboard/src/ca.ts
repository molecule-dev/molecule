import type { ClipboardTranslations } from './types.js'

/** Clipboard translations for ca. */
export const ca: Partial<ClipboardTranslations> = {
  'clipboard.warn.onChangeNotSupported':
    '@molecule/app-clipboard: onChange no és compatible amb el proveïdor',
  'clipboard.error.noProvider':
    "@molecule/app-clipboard: No s'ha definit cap proveïdor. Crida setProvider() amb una implementació de ClipboardProvider (per exemple, des de @molecule/app-clipboard-capacitor).",
}
