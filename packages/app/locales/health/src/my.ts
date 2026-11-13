import type { HealthTranslations } from './types.js'

/** Health translations for Burmese. */
export const my: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}နာ {{minutes}}မိ',
  'health.durationMinutes': '{{minutes}}မိ',
  'health.error.noProvider':
    '`@molecule/app-health`: ကျန်းမာရေးဝန်ဆောင်မှုပေးသူ ချိတ်ဆက်ထားခြင်း မရှိပါ — သင့် native runtime (Apple HealthKit / Android Health Connect / Google Fit) တွင် `HealthProvider` interface ကို implement လုပ်ပြီး startup တွင် `setProvider()` နှင့် ချိတ်ဆက်ပါ။ Molecule သည် ၎င်းအတွက် ဝန်ဆောင်မှုပေးသူ မပို့ပါ။ မခေါ်မီ `hasProvider()` သို့မဟုတ် `getCapabilities().supported` ဖြင့် feature-detect လုပ်ပါ — ကျန်းမာရေးဖတ်ရှုခြင်းတွင် ရိုးသားသော default မပါရှိသောကြောင့် ၎င်းသည် မှားယွင်းသောဒေတာကို ပြန်ပေးမည့်အစား ပစ်ချပါသည်။',
}
