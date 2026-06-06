import type { ClipboardTranslations } from './types.js'

/** Clipboard translations for tr. */
export const tr: Partial<ClipboardTranslations> = {
  'clipboard.warn.onChangeNotSupported':
    '@molecule/app-clipboard: onChange sağlayıcı tarafından desteklenmiyor',
  'clipboard.error.noProvider':
    "@molecule/app-clipboard: Sağlayıcı ayarlanmadı. Lütfen bir ClipboardProvider uygulamasıyla (örneğin, @molecule/app-clipboard-capacitor'dan) setProvider() işlevini çağırın.",
}
