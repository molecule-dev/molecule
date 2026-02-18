import type { ClipboardTranslations } from './types.js'

/** Clipboard translations for Lithuanian. */
export const lt: ClipboardTranslations = {
  'clipboard.error.noProvider':
    '@molecule/app-clipboard: Teikėjas nenustatytas. Iškvieskite setProvider() su ClipboardProvider realizacija (pvz., iš @molecule/app-clipboard-capacitor).',
  'clipboard.warn.onChangeNotSupported': '@molecule/app-clipboard: onChange nepalaikomas teikėjo',
}
