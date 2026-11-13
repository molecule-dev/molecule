import type { ClipboardTranslations } from './types.js'

/** Clipboard translations for Burmese. */
export const my: ClipboardTranslations = {
  'clipboard.error.noProvider':
    '@molecule/app-clipboard: ပံ့ပိုးသူ သတ်မှတ်ထားခြင်း မရှိပါ။ ClipboardProvider အကောင်အထည်ဖော်မှုဖြင့် setProvider() ကို ခေါ်ပါ (ဥပမာ၊ @molecule/app-clipboard-react-native မှ)။',
  'clipboard.warn.onChangeNotSupported':
    '@molecule/app-clipboard: onChange ကို ပံ့ပိုးသူက ပံ့ပိုးမထားပါ',
  'clipboard.error.missingDependency':
    '`{{library}}` လိုအပ်သော်လည်း ထည့်သွင်းထားခြင်း မရှိပါ။ အောက်ပါဖြင့် ထည့်သွင်းပါ- `npm install {{library}}`',
}
