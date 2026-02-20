import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Burmese. */
export const my: MonitoringTranslations = {
  'monitoring.error.noProvider': 'Monitoring provider not configured. Call setProvider() first.',
  'monitoring.check.database.notBonded': 'Database bond not configured.',
  'monitoring.check.database.poolUnavailable': 'ဒေတာဘေ့စ်ပူးလ်မရရှိနိုင်ပါ။',
  'monitoring.check.cache.notBonded': 'Cache bond not configured.',
  'monitoring.check.cache.providerUnavailable': 'ကက်ရှ်ပံ့ပိုးသူမရရှိနိုင်ပါ။',
  'monitoring.check.http.badStatus': 'HTTP {{status}} response.',
  'monitoring.check.http.timeout': 'Request timed out.',
  'monitoring.check.http.degraded':
    'တုံ့ပြန်ချိန် {{latencyMs}}ms သည် {{thresholdMs}}ms အတားအဆီးကိုကျော်လွန်သွားပါပြီ။',
  'monitoring.check.bond.notBonded': "Bond '{{bondType}}' is not registered.",
  'monitoring.check.timedOut': '{{timeoutMs}}ms ပြီးနောက်စစ်ဆေးချိန်ကုန်သွားပါပြီ။',
}
