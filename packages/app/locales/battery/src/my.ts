import type { BatteryTranslations } from './types.js'

/** Battery translations for Burmese. */
export const my: BatteryTranslations = {
  'battery.charging': 'အားသွင်းနေသည်',
  'battery.discharging': 'ဘက်ထရီအသုံးပြုနေသည်',
  'battery.full': 'အပြည့်အားသွင်းပြီး',
  'battery.not-charging': 'အားမသွင်းနေပါ',
  'battery.unknown': 'မသိ',
  'battery.remainingUnknown': 'မသိ',
  'battery.remainingTime': '{{hours}}နာရီ {{minutes}}မိနစ်',
  'battery.remainingMinutes': '{{minutes}}မိနစ်',
  'battery.error.noProvider':
    '`@molecule/app-battery`: provider သတ်မှတ်မထားပါ။ `BatteryProvider` အကောင်အထည်ဖော်မှုဖြင့် `setProvider()` ကိုခေါ်ဆိုပါ — မည်သည့် provider မှ fleet နှင့်အတူ ပို့ဆောင်ခြင်းမရှိပါ။ သင်၏ native runtime တွင် interface ကို အကောင်အထည်ဖော်ပြီး ၎င်းကို ချိတ်ဆက်ပါ။',
}
