import type { ClipboardTranslations } from './types.js'

/** Clipboard translations for Finnish. */
export const fi: ClipboardTranslations = {
  'clipboard.error.noProvider':
    '@molecule/app-clipboard: Palveluntarjoajaa ei ole asetettu. Kutsu setProvider() ClipboardProvider-toteutuksella (esim. @molecule/app-clipboard-react-native).',
  'clipboard.warn.onChangeNotSupported':
    '@molecule/app-clipboard: onChange ei ole palveluntarjoajan tukema',
}
