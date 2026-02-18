import type { ConfigTranslations } from './types.js'

/** Config translations for Burmese. */
export const my: ConfigTranslations = {
  'config.error.required': "လိုအပ်သော ဖွဲ့စည်းမှု '{{key}}' သတ်မှတ်မထားပါ။",
  'config.error.mustBeNumber': "ဖွဲ့စည်းမှု '{{key}}' သည် နံပါတ်ဖြစ်ရမည်။",
  'config.error.minValue': "ဖွဲ့စည်းမှု '{{key}}' သည် အနည်းဆုံး {{min}} ဖြစ်ရမည်။",
  'config.error.maxValue': "ဖွဲ့စည်းမှု '{{key}}' သည် အများဆုံး {{max}} ဖြစ်ရမည်။",
  'config.error.mustBeBoolean': "ဖွဲ့စည်းမှု '{{key}}' သည် boolean ဖြစ်ရမည် (true/false/1/0)။",
  'config.error.mustBeJson': "ဖွဲ့စည်းမှု '{{key}}' သည် တရားဝင် JSON ဖြစ်ရမည်။",
  'config.error.patternMismatch': "ဖွဲ့စည်းမှု '{{key}}' သည် ပုံစံ '{{pattern}}' နှင့် မကိုက်ညီပါ။",
  'config.error.invalidEnum': "ဖွဲ့စည်းမှု '{{key}}' သည် ဤတို့မှ တစ်ခုဖြစ်ရမည်: {{values}}။",
  'config.error.validationNotSupported':
    'လက်ရှိ ဖွဲ့စည်းမှု ပံ့ပိုးသူသည် အတည်ပြုခြင်းကို မပံ့ပိုးပါ။',
}
