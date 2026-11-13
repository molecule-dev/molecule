import type { ChatTranslations } from './types.js'

/** Ai Chat translations for Burmese. */
export const my: ChatTranslations = {
  'chat.error.httpError': 'HTTP {{status}}: {{text}}',
  'chat.error.noResponseBody': 'Response body မရှိပါ',
  'chat.error.streamError': 'Stream အမှား',
  'chat.error.unknownError': 'မသိသော အမှား',
  'chat.error.sendFailed': 'မက်ဆေ့ချ်ပို့၍မရပါ',
  'chat.error.stalled':
    '{{agentName}} သည် တုံ့ပြန်မှု ရပ်တန့်သွားခဲ့သည်။ ၎င်းသည် နောက်ခံတွင် ပြီးနေဆဲဖြစ်နိုင်သည် — နောက်ဆုံးထွက်ကိုကြည့်ရန် ပြန်လည်စတင်ပါ သို့မဟုတ် မက်ဆေ့ချ်အသစ်တစ်ခု ပေးပို့ပါ။',
  'aiChat.error.noProvider':
    'AI ချတ်ဝန်ဆောင်မှုပေးသူကို ပြင်ဆင်သတ်မှတ်မထားပါ။ AI ချတ်ဝန်ဆောင်မှုပေးသူကို ဦးစွာ ချိတ်ဆက်ပါ။',
}
