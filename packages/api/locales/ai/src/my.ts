import type { AiTranslations } from './types.js'

/** Ai translations for Burmese. */
export const my: AiTranslations = {
  'ai.error.noProvider':
    'AI ပံ့ပိုးသူ ပြင်ဆင်သတ်မှတ်ထားခြင်းမရှိပါ။ AI ပံ့ပိုးသူကို အရင်ချိတ်ဆက်ပါ။',
  'ai.error.ambiguousProvider':
    'အမည်ရှိ AI ပံ့ပိုးသူ များစွာ ချိတ်ဆက်ထားပြီး မူရင်းတစ်ခု သတ်မှတ်မထားပါ။ တစ်ခုရွေးရန် getProviderByName(name) ကို သုံးပါ။',
  'ai.error.responseIncomplete':
    'AI တုံ့ပြန်မှုသည် ပြီးစီးမှုမတိုင်မီ ပြီးဆုံးသွားခဲ့သည်။ ထပ်မံကြိုးစားပါ။',
  'ai.error.responseTokenLimit':
    'AI တုံ့ပြန်မှုသည် ပြီးစီးမှုမတိုင်မီ output token ကန့်သတ်ချက်သို့ ရောက်ရှိခဲ့သည်။',
  'ai.error.apiError': 'AI ဝန်ဆောင်မှု အမှားအယွင်း။ ထပ်ကြိုးစားပါ။',
  'ai.error.noResponseBody': 'AI ဝန်ဆောင်မှုမှ တုံ့ပြန်မှု မရှိပါ။',
}
