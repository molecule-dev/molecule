import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Marathi. */
export const mr: MonitoringTranslations = {
  'monitoring.error.noProvider': 'Monitoring provider not configured. Call setProvider() first.',
  'monitoring.check.database.notBonded': 'Database bond not configured.',
  'monitoring.check.database.poolUnavailable': 'डेटाबेस पूल अनुपलब्ध.',
  'monitoring.check.cache.notBonded': 'Cache bond not configured.',
  'monitoring.check.cache.providerUnavailable': 'कॅशे प्रदाता अनुपलब्ध.',
  'monitoring.check.http.badStatus': 'HTTP {{status}} response.',
  'monitoring.check.http.timeout': 'Request timed out.',
  'monitoring.check.http.degraded':
    'प्रतिसाद वेळ {{latencyMs}}ms ने सीमा {{thresholdMs}}ms ओलांडली.',
  'monitoring.check.bond.notBonded': "Bond '{{bondType}}' is not registered.",
  'monitoring.check.timedOut': '{{timeoutMs}}ms नंतर तपासणी कालबाह्य झाली.',
}
