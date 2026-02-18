import type { ClipboardTranslations } from './types.js'

/** Clipboard translations for English. */
export const en: ClipboardTranslations = {
  'clipboard.error.noProvider':
    '@molecule/app-clipboard: No provider set. Call setProvider() with a ClipboardProvider implementation (e.g., from @molecule/app-clipboard-capacitor).',
  'clipboard.warn.onChangeNotSupported':
    '@molecule/app-clipboard: onChange not supported by provider',
}
