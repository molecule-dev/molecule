import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Burmese. */
export const my: BodyParserTranslations = {
  'middleware.error.badRequest': 'တောင်းဆိုမှု မမှန်ကန်ပါ။',
  'middleware.error.fileTooLarge': 'ဖိုင်သည် {{limit}} ထက် ကြီးနေသည်။',
  'middleware.error.fileTypeNotAllowed':
    'ဤဖိုင်အမျိုးအစားကို ခွင့်မပြုပါ။ ခွင့်ပြုထားသော အမျိုးအစားများ- {{types}}။',
  'middleware.error.fileMissing': '"{{field}}" အကွက်တွင် ဖိုင်တစ်ခု ပို့ပါ။',
  'middleware.error.tooManyFiles': 'ဖိုင်များ အလွန်များနေသည်။ ကန့်သတ်ချက်မှာ {{max}} ဖြစ်သည်။',
  'middleware.error.unexpectedFile':
    'ဖိုင်ကို "{{field}}" မဟုတ်ဘဲ "{{expected}}" အကွက်တွင် ပို့ပါ။',
  'middleware.error.notMultipart':
    'ဖိုင်ကို multipart/form-data အဖြစ် "{{field}}" အကွက်တွင် ပို့ပါ။',
  'middleware.error.payloadTooLarge': 'တောင်းဆိုမှု အလွန်ကြီးနေသည်။',
}
