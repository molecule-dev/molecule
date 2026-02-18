import type { ClipboardTranslations } from './types.js'

/** Clipboard translations for Greek. */
export const el: ClipboardTranslations = {
  'clipboard.error.noProvider':
    '@molecule/app-clipboard: Δεν έχει οριστεί πάροχος. Καλέστε setProvider() με μια υλοποίηση ClipboardProvider (π.χ. από @molecule/app-clipboard-capacitor).',
  'clipboard.warn.onChangeNotSupported':
    '@molecule/app-clipboard: το onChange δεν υποστηρίζεται από τον πάροχο',
}
