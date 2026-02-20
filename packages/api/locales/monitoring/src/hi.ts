import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Hindi. */
export const hi: MonitoringTranslations = {
  'monitoring.error.noProvider':
    'मॉनिटरिंग प्रदाता कॉन्फ़िगर नहीं है। पहले setProvider() कॉल करें।',
  'monitoring.check.database.notBonded': 'डेटाबेस बॉन्ड कॉन्फ़िगर नहीं है।',
  'monitoring.check.database.poolUnavailable': 'डेटाबेस पूल अनुपलब्ध।',
  'monitoring.check.cache.notBonded': 'कैश बॉन्ड कॉन्फ़िगर नहीं है।',
  'monitoring.check.cache.providerUnavailable': 'कैश प्रदाता अनुपलब्ध।',
  'monitoring.check.http.badStatus': 'HTTP {{status}} प्रतिक्रिया।',
  'monitoring.check.http.timeout': 'अनुरोध का समय समाप्त हो गया।',
  'monitoring.check.http.degraded':
    'प्रतिक्रिया समय {{latencyMs}}ms ने सीमा {{thresholdMs}}ms को पार किया।',
  'monitoring.check.bond.notBonded': "बॉन्ड '{{bondType}}' पंजीकृत नहीं है।",
  'monitoring.check.timedOut': '{{timeoutMs}}ms के बाद जाँच का समय समाप्त हो गया।',
}
