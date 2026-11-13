import type { ClipboardTranslations } from './types.js'

/** Clipboard translations for Bosnian. */
export const bs: ClipboardTranslations = {
  'clipboard.error.noProvider':
    '@molecule/app-clipboard: Provajder nije postavljen. Pozovite setProvider() sa ClipboardProvider implementacijom (npr. iz @molecule/app-clipboard-react-native).',
  'clipboard.warn.onChangeNotSupported':
    '@molecule/app-clipboard: onChange nije podržan od strane provajdera',
  'clipboard.error.missingDependency':
    '`{{library}}` je obavezan, ali nije instaliran. Instalirajte ga sa: `npm install {{library}}`',
}
