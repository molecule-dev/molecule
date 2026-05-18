import type { BillingTranslations } from './types.js'

/** Billing translations for my. */
export const my: Partial<BillingTranslations> = {
  'billing.status.loading': 'တင်နေသည်…',
  'billing.status.currentPlan': 'လက်ရှိအစီအစဉ်-<x> {{tierName}}</x>',
  'billing.status.cancelCta': 'စာရင်းသွင်းမှုကို ပယ်ဖျက်ပါ',
  'billing.status.cancelError': 'ပယ်ဖျက်၍မရပါ။ ထပ်မံကြိုးစားပါ။',
  'billing.pricing.loading': 'အစီအစဉ်များကို တင်နေသည်…',
  'billing.pricing.error': 'ဈေးနှုန်းတင်၍မရပါ။ နောက်မှ ထပ်မံကြိုးစားပါ။',
  'billing.pricing.checkoutError': 'ငွေရှင်းခြင်းကို စတင်၍မရပါ။ ထပ်မံကြိုးစားပါ။',
  'billing.pricing.reassurance': 'အချိန်မရွေး ပယ်ဖျက်နိုင်သည် · စတင်ရန် ခရက်ဒစ်ကတ် မလိုအပ်ပါ',
  'billing.pricing.mostPopular': 'အကျော်ကြားဆုံး',
  'billing.pricing.tierEyebrow': 'အဆင့်',
  'billing.pricing.perSeat': 'ထိုင်ခုံတစ်ခုလျှင်',
  'billing.pricing.upgradeCta': 'အဆင့်မြှင့်တင်ရန်<x> {{tierName}}</x>',
}
