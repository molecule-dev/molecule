import type { ClipboardTranslations } from './types.js'

/** Clipboard translations for Portuguese. */
export const pt: ClipboardTranslations = {
  'clipboard.error.noProvider':
    '@molecule/app-clipboard: Nenhum provedor definido. Chame setProvider() com uma implementação de ClipboardProvider (ex., de @molecule/app-clipboard-react-native).',
  'clipboard.warn.onChangeNotSupported':
    '@molecule/app-clipboard: onChange não é suportado pelo provedor',
}
