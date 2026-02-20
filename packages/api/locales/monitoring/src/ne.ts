import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Nepali. */
export const ne: MonitoringTranslations = {
  'monitoring.error.noProvider': 'Monitoring provider not configured. Call setProvider() first.',
  'monitoring.check.database.notBonded': 'Database bond not configured.',
  'monitoring.check.database.poolUnavailable': 'डाटाबेस पूल उपलब्ध छैन।',
  'monitoring.check.cache.notBonded': 'Cache bond not configured.',
  'monitoring.check.cache.providerUnavailable': 'क्यास प्रदायक उपलब्ध छैन।',
  'monitoring.check.http.badStatus': 'HTTP {{status}} response.',
  'monitoring.check.http.timeout': 'Request timed out.',
  'monitoring.check.http.degraded':
    'प्रतिक्रिया समय {{latencyMs}}ms ले सीमा {{thresholdMs}}ms नाघ्यो।',
  'monitoring.check.bond.notBonded': "Bond '{{bondType}}' is not registered.",
  'monitoring.check.timedOut': '{{timeoutMs}}ms पछि जाँच समय सकियो।',
}
