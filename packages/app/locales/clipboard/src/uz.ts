import type { ClipboardTranslations } from './types.js'

/** Clipboard translations for uz. */
export const uz: Partial<ClipboardTranslations> = {
  'clipboard.error.noProvider':
    "@molecule/app-clipboard: Provayder o'rnatilmagan. ClipboardProvider implementatsiyasi bilan setProvider() ni chaqiring (masalan, @molecule/app-clipboard-react-native dan).",
  'clipboard.warn.onChangeNotSupported':
    "@molecule/app-clipboard: onChange provayder tomonidan qo'llab-quvvatlanmaydi",
  'clipboard.error.missingDependency':
    "`{{library}}` talab qilinadi, lekin o'rnatilmagan. Uni quyidagi bilan o'rnating: `npm install {{library}}`",
}
