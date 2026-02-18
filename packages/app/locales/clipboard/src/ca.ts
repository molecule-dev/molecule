import type { ClipboardTranslations } from './types.js'

/** Clipboard translations for Catalan. */
export const ca: ClipboardTranslations = {
  'clipboard.error.noProvider':
    "@molecule/app-clipboard: No s'ha establert cap proveïdor. Crideu setProvider() amb una implementació de ClipboardProvider (p. ex., de @molecule/app-clipboard-capacitor).",
  'clipboard.warn.onChangeNotSupported':
    '@molecule/app-clipboard: onChange no és compatible amb el proveïdor',
}
