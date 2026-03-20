import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Nepali. */
export const ne: MonitoringTranslations = {
  'monitoring.error.noProvider':
    'मोनिटरिङ प्रदायक कन्फिगर गरिएको छैन। पहिले setProvider() कल गर्नुहोस्।',
  'monitoring.check.database.notBonded': 'डाटाबेस बन्ड कन्फिगर गरिएको छैन।',
  'monitoring.check.database.poolUnavailable': 'डाटाबेस पूल उपलब्ध छैन।',
  'monitoring.check.cache.notBonded': 'क्यास बन्ड कन्फिगर गरिएको छैन।',
  'monitoring.check.cache.providerUnavailable': 'क्यास प्रदायक उपलब्ध छैन।',
  'monitoring.check.http.badStatus': 'HTTP {{status}} प्रतिक्रिया।',
  'monitoring.check.http.timeout': 'अनुरोधको समय सकियो।',
  'monitoring.check.http.degraded':
    'प्रतिक्रिया समय {{latencyMs}}ms ले सीमा {{thresholdMs}}ms नाघ्यो।',
  'monitoring.check.bond.notBonded': "Bond '{{bondType}}' दर्ता गरिएको छैन।",
  'monitoring.check.timedOut': '{{timeoutMs}}ms पछि जाँच समय सकियो।',
}
