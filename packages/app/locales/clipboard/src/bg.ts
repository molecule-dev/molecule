import type { ClipboardTranslations } from './types.js'

/** Clipboard translations for Bulgarian. */
export const bg: ClipboardTranslations = {
  'clipboard.error.noProvider':
    '@molecule/app-clipboard: Не е зададен доставчик. Извикайте setProvider() с имплементация на ClipboardProvider (напр. от @molecule/app-clipboard-react-native).',
  'clipboard.warn.onChangeNotSupported':
    '@molecule/app-clipboard: onChange не се поддържа от доставчика',
  'clipboard.error.missingDependency':
    '`{{library}}` е задължителна, но не е инсталирана. Инсталирайте я с: `npm install {{library}}`',
}
