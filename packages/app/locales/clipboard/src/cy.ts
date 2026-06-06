import type { ClipboardTranslations } from './types.js'

/** Clipboard translations for cy. */
export const cy: Partial<ClipboardTranslations> = {
  'clipboard.warn.onChangeNotSupported':
    '@molecule/app-clipboard: nid yw onChange yn cael ei gefnogi gan y darparwr',
  'clipboard.error.noProvider':
    "@molecule/app-clipboard: Dim darparwr wedi'i osod. Galwch setProvider() gyda gweithrediad ClipboardProvider (e.e., o @molecule/app-clipboard-capacitor).",
}
