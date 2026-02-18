import type { ClipboardTranslations } from './types.js'

/** Clipboard translations for Croatian. */
export const hr: ClipboardTranslations = {
  'clipboard.error.noProvider':
    '@molecule/app-clipboard: Pružatelj nije postavljen. Pozovite setProvider() s implementacijom ClipboardProvider (npr. iz @molecule/app-clipboard-capacitor).',
  'clipboard.warn.onChangeNotSupported':
    '@molecule/app-clipboard: onChange nije podržan od strane pružatelja',
}
