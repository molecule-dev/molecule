import type { ClipboardTranslations } from './types.js'

/** Clipboard translations for Turkish. */
export const tr: ClipboardTranslations = {
  'clipboard.error.noProvider':
    "@molecule/app-clipboard: Sağlayıcı ayarlanmamış. setProvider() işlevini bir ClipboardProvider uygulamasıyla çağırın (ör., @molecule/app-clipboard-capacitor'dan).",
  'clipboard.warn.onChangeNotSupported':
    '@molecule/app-clipboard: onChange sağlayıcı tarafından desteklenmiyor',
}
