import type { StorageTranslations } from './types.js'

/** Storage translations for Burmese. */
export const my: StorageTranslations = {
  'storage.error.noProvider':
    'သိုလှောင်ခြင်း ဝန်ဆောင်မှုပေးသူ ကို ပြင်ဆင်မထားပါ။ setProvider() ကို အရင်ခေါ်ပါ။',
  'storage.error.quotaExceeded':
    '"{{key}}" သော့ကို သတ်မှတ်စဉ် သိုလှောင်ခွင့်ပြု ပမာဏ ကျော်လွန်သွားသည်',
  'storage.error.asyncStorageUnavailable':
    '`@react-native-async-storage/async-storage` ထည့်သွင်းမထားပါ။ ၎င်းကို အောက်ပါဖြင့် ထည့်သွင်းပါ- `npm install @react-native-async-storage/async-storage`',
  'storage.error.setFailed':
    'AsyncStorage တွင် " {{key}} " သော့အတွက် တန်ဖိုးသတ်မှတ်ခြင်း မအောင်မြင်ခဲ့ပါ။',
}
