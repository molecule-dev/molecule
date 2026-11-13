import type { ClipboardTranslations } from './types.js'

/** Clipboard translations for Macedonian. */
export const mk: ClipboardTranslations = {
  'clipboard.error.noProvider':
    '@molecule/app-clipboard: Не е поставен провајдер. Повикајте setProvider() со имплементација на ClipboardProvider (на пр., од @molecule/app-clipboard-react-native).',
  'clipboard.warn.onChangeNotSupported':
    '@molecule/app-clipboard: onChange не е поддржан од провајдерот',
  'clipboard.error.missingDependency':
    '`{{library}}` е задолжителна, но не е инсталирана. Инсталирајте ја со: `npm install {{library}}`',
}
