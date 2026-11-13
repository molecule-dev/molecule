import type { ClipboardTranslations } from './types.js'

/** Clipboard translations for Kazakh. */
export const kk: ClipboardTranslations = {
  'clipboard.error.noProvider':
    '@molecule/app-clipboard: Провайдер орнатылмаған. setProvider() функциясын ClipboardProvider іске асырумен шақырыңыз (мыс., @molecule/app-clipboard-react-native-дан).',
  'clipboard.warn.onChangeNotSupported':
    '@molecule/app-clipboard: onChange провайдер тарапынан қолдау көрсетілмейді',
  'clipboard.error.missingDependency':
    '`{{library}}` қажет, бірақ орнатылмаған. Оны келесідей орнатыңыз: `npm install {{library}}`',
}
