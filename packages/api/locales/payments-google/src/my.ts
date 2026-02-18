import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for Burmese. */
export const my: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    'Google Play ပက်ကေ့ခ်ျအမည် ပျောက်ဆုံးနေသည် (process.env.GOOGLE_PLAY_PACKAGE_NAME)။',
  'payments.google.warn.missingServiceKey':
    'Google API ဝန်ဆောင်မှု သော့အရာဝတ္ထု ပျောက်ဆုံးနေသည် (process.env.GOOGLE_API_SERVICE_KEY_OBJECT)။',
  'payments.google.error.serviceKeyNotConfigured':
    'Google API ဝန်ဆောင်မှု သော့အရာဝတ္ထုကို ပြင်ဆင်သတ်မှတ်ထားခြင်းမရှိပါ',
  'payments.google.error.parseServiceKey':
    'Google API ဝန်ဆောင်မှု သော့အရာဝတ္ထု ခွဲခြမ်းစိတ်ဖြာရာတွင် အမှား:',
}
