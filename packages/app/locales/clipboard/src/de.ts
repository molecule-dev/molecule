import type { ClipboardTranslations } from './types.js'

/** Clipboard translations for German. */
export const de: ClipboardTranslations = {
  'clipboard.error.noProvider':
    '@molecule/app-clipboard: Kein Anbieter festgelegt. Rufen Sie setProvider() mit einer ClipboardProvider-Implementierung auf (z. B. von @molecule/app-clipboard-capacitor).',
  'clipboard.warn.onChangeNotSupported':
    '@molecule/app-clipboard: onChange wird vom Anbieter nicht unterstützt',
}
