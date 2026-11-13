import type { ClipboardTranslations } from './types.js'

/** Clipboard translations for Croatian. */
export const hr: ClipboardTranslations = {
  'clipboard.error.noProvider':
    '@molecule/app-clipboard: Pružatelj nije postavljen. Pozovite setProvider() s implementacijom ClipboardProvider (npr. iz @molecule/app-clipboard-react-native).',
  'clipboard.warn.onChangeNotSupported':
    '@molecule/app-clipboard: onChange nije podržan od strane pružatelja',
  'clipboard.error.missingDependency':
    '`{{library}}` je potreban, ali nije instaliran. Instalirajte ga s: `npm install {{library}}`',
}
