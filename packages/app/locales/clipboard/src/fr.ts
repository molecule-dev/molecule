import type { ClipboardTranslations } from './types.js'

/** Clipboard translations for fr. */
export const fr: Partial<ClipboardTranslations> = {
  'clipboard.error.noProvider':
    '@molecule/app-clipboard: Aucun fournisseur défini. Appelez setProvider() avec une implémentation de ClipboardProvider (par ex., depuis @molecule/app-clipboard-capacitor).',
  'clipboard.warn.onChangeNotSupported':
    '@molecule/app-clipboard : onChange n’est pas pris en charge par le fournisseur',
}
