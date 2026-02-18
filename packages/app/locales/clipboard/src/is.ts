import type { ClipboardTranslations } from './types.js'

/** Clipboard translations for Icelandic. */
export const is: ClipboardTranslations = {
  'clipboard.error.noProvider':
    '@molecule/app-clipboard: Enginn þjónustuaðili stilltur. Kallaðu á setProvider() með ClipboardProvider útfærslu (t.d. frá @molecule/app-clipboard-capacitor).',
  'clipboard.warn.onChangeNotSupported':
    '@molecule/app-clipboard: onChange er ekki stutt af þjónustuaðila',
}
