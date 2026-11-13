import type { ClipboardTranslations } from './types.js'

/** Clipboard translations for Albanian. */
export const sq: ClipboardTranslations = {
  'clipboard.error.noProvider':
    '@molecule/app-clipboard: Asnjë ofrues i vendosur. Thirrni setProvider() me një implementim të ClipboardProvider (p.sh., nga @molecule/app-clipboard-react-native).',
  'clipboard.warn.onChangeNotSupported':
    '@molecule/app-clipboard: onChange nuk mbështetet nga ofruesi',
  'clipboard.error.missingDependency':
    '`{{library}}` është e detyrueshme, por nuk është instaluar. Instalojeni me: `npm install {{library}}`',
}
