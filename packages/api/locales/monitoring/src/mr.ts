import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Marathi. */
export const mr: MonitoringTranslations = {
  'monitoring.error.noProvider':
    'मॉनिटरिंग प्रदाता कॉन्फिगर केलेला नाही. आधी setProvider() कॉल करा.',
  'monitoring.check.database.notBonded': 'डेटाबेस बॉन्ड कॉन्फिगर केलेले नाही.',
  'monitoring.check.database.poolUnavailable': 'डेटाबेस पूल अनुपलब्ध.',
  'monitoring.check.cache.notBonded': 'कॅशे बॉन्ड कॉन्फिगर केलेले नाही.',
  'monitoring.check.cache.providerUnavailable': 'कॅशे प्रदाता अनुपलब्ध.',
  'monitoring.check.http.badStatus': 'HTTP {{status}} प्रतिसाद.',
  'monitoring.check.http.timeout': 'विनंतीआ कालबाह्य झाली.',
  'monitoring.check.http.degraded':
    'प्रतिसाद वेळ {{latencyMs}}ms ने सीमा {{thresholdMs}}ms ओलांडली.',
  'monitoring.check.bond.notBonded': "Bond '{{bondType}}' नोंदणीकृत नाही.",
  'monitoring.check.timedOut': '{{timeoutMs}}ms नंतर तपासणी कालबाह्य झाली.',
}
