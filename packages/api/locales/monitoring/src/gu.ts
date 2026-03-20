import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Gujarati. */
export const gu: MonitoringTranslations = {
  'monitoring.error.noProvider':
    'મોનિટરિંગ પ્રદાતા કોન્ફિગર કરેલ નથી. પહેલાં setProvider() કોલ કરો.',
  'monitoring.check.database.notBonded': 'ડેટાબેઝ બોન્ડ કોન્ફિગર કરેલ નથી.',
  'monitoring.check.database.poolUnavailable': 'ડેટાબેઝ પૂલ અનુપલબ્ધ.',
  'monitoring.check.cache.notBonded': 'કેશ બોન્ડ કોન્ફિગર કરેલ નથી.',
  'monitoring.check.cache.providerUnavailable': 'કેશ પ્રદાતા અનુપલબ્ધ.',
  'monitoring.check.http.badStatus': 'HTTP {{status}} પ્રતિસાદ.',
  'monitoring.check.http.timeout': 'વિનંતીનો સમય સમાપ્ત થયો.',
  'monitoring.check.http.degraded':
    'પ્રતિસાદ સમય {{latencyMs}}ms થ્રેશોલ્ડ {{thresholdMs}}ms કરતાં વધી ગયો.',
  'monitoring.check.bond.notBonded': "Bond '{{bondType}}' નોંધાયેલ નથી.",
  'monitoring.check.timedOut': '{{timeoutMs}}ms પછી ચકાસણી સમયસમાપ્ત થઈ.',
}
