import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Gujarati. */
export const gu: MonitoringTranslations = {
  'monitoring.error.noProvider': 'Monitoring provider not configured. Call setProvider() first.',
  'monitoring.check.database.notBonded': 'Database bond not configured.',
  'monitoring.check.database.poolUnavailable': 'ડેટાબેઝ પૂલ અનુપલબ્ધ.',
  'monitoring.check.cache.notBonded': 'Cache bond not configured.',
  'monitoring.check.cache.providerUnavailable': 'કેશ પ્રદાતા અનુપલબ્ધ.',
  'monitoring.check.http.badStatus': 'HTTP {{status}} response.',
  'monitoring.check.http.timeout': 'Request timed out.',
  'monitoring.check.http.degraded':
    'પ્રતિસાદ સમય {{latencyMs}}ms થ્રેશોલ્ડ {{thresholdMs}}ms કરતાં વધી ગયો.',
  'monitoring.check.bond.notBonded': "Bond '{{bondType}}' is not registered.",
  'monitoring.check.timedOut': '{{timeoutMs}}ms પછી ચકાસણી સમયસમાપ્ત થઈ.',
}
