import type { ClipboardTranslations } from './types.js'

/** Clipboard translations for Spanish. */
export const es: ClipboardTranslations = {
  'clipboard.error.noProvider':
    '@molecule/app-clipboard: No se ha establecido un proveedor. Llame a setProvider() con una implementación de ClipboardProvider (p. ej., de @molecule/app-clipboard-react-native).',
  'clipboard.warn.onChangeNotSupported':
    '@molecule/app-clipboard: onChange no es compatible con el proveedor',
}
