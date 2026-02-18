import type { ClipboardTranslations } from './types.js'

/** Clipboard translations for Belarusian. */
export const be: ClipboardTranslations = {
  'clipboard.error.noProvider':
    '@molecule/app-clipboard: Правайдар не ўсталяваны. Выклічце setProvider() з рэалізацыяй ClipboardProvider (напр., з @molecule/app-clipboard-capacitor).',
  'clipboard.warn.onChangeNotSupported':
    '@molecule/app-clipboard: onChange не падтрымліваецца правайдарам',
}
