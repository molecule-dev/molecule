import type { UploadsTranslations } from './types.js'

/** Uploads translations for Burmese. */
export const my: UploadsTranslations = {
  'uploads.error.noProvider': 'အပ်လုဒ် ပံ့ပိုးသူကို စီစဉ်မထားပါ။ အရင် setProvider() ကို ခေါ်ပါ။',
  'uploads.error.streamLimitReached': 'စတရိမ်ကန့်သတ်ချက်ပြည့်ပါပြီ။',
  'uploads.error.aborted': 'အပ်လုဒ်ကို ပယ်ဖျက်လိုက်သည်။',
  'uploads.error.fileTypeBlocked': '{{type}} အမျိုးအစား ဖိုင်များကို အပ်လုဒ်လုပ်၍ မရပါ။',
  'uploads.error.activeTypeListed':
    'receiveUploads() တွင် ဘရောက်ဇာက လုပ်ဆောင်သည့် အမျိုးအစား {{type}} ပါဝင်သည်။ သိမ်းရန် allowActiveTypes: true ကို ပေးပြီး ထိုဖိုင်များကို sendUpload() ဖြင့် ပေးပို့ပါ။',
}
