import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Burmese. */
export const my: MonitoringTranslations = {
  'monitoring.error.noProvider':
    'မောနီတာနာ ပံ့ပိုးသူ ကွန်ဖီဂယူရေးမလုပ်ရက်ပါ။ အရင် setProvider() ကို ခေါ်ယုပါ။',
  'monitoring.check.database.notBonded': 'ဒေတာဘေ့စ် ဘော်န် ကွန်ဖီဂယူရေးမလုပ်ရက်ပါ။',
  'monitoring.check.database.poolUnavailable': 'ဒေတာဘေ့စ်ပူးလ်မရရှိနိုင်ပါ။',
  'monitoring.check.cache.notBonded': 'ကက်ရှ် ဘော်န် ကွန်ဖီဂယူရေးမလုပ်ရက်ပါ။',
  'monitoring.check.cache.providerUnavailable': 'ကက်ရှ်ပံ့ပိုးသူမရရှိနိုင်ပါ။',
  'monitoring.check.http.badStatus': 'HTTP {{status}} တုံ့ပြန်ချက်။',
  'monitoring.check.http.timeout': 'တောင်းဆိုချိန်ကုန်သွားပါပြီ။',
  'monitoring.check.http.degraded':
    'တုံ့ပြန်ချိန် {{latencyMs}}ms သည် {{thresholdMs}}ms အတားအဆီးကိုကျော်လွန်သွားပါပြီ။',
  'monitoring.check.bond.notBonded': "Bond '{{bondType}}' မှတ်ပုံတင်ရက်ပါ။",
  'monitoring.check.timedOut': '{{timeoutMs}}ms ပြီးနောက်စစ်ဆေးချိန်ကုန်သွားပါပြီ။',
}
