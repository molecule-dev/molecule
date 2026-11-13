import type { ClipboardTranslations } from './types.js'

/** Clipboard translations for Kyrgyz. */
export const ky: ClipboardTranslations = {
  'clipboard.error.noProvider':
    '@molecule/app-clipboard: Провайдер коюлган эмес. setProvider() функциясын ClipboardProvider ишке ашыруу менен чакырыңыз (мис., @molecule/app-clipboard-react-native-дан).',
  'clipboard.warn.onChangeNotSupported':
    '@molecule/app-clipboard: onChange провайдер тарабынан колдоого алынбайт',
  'clipboard.error.missingDependency':
    '`{{library}}` талап кылынат, бирок орнотулган эмес. Аны төмөнкү менен орнотуңуз: `npm install {{library}}`',
}
