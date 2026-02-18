import type { ClipboardTranslations } from './types.js'

/** Clipboard translations for Hungarian. */
export const hu: ClipboardTranslations = {
  'clipboard.error.noProvider':
    '@molecule/app-clipboard: Nincs szolgáltató beállítva. Hívja meg a setProvider()-t egy ClipboardProvider implementációval (pl. a @molecule/app-clipboard-capacitor-ból).',
  'clipboard.warn.onChangeNotSupported':
    '@molecule/app-clipboard: az onChange-t a szolgáltató nem támogatja',
}
