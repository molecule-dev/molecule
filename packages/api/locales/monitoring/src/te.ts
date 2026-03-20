import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Telugu. */
export const te: MonitoringTranslations = {
  'monitoring.error.noProvider':
    'మానిటరింగ్ ప్రొవైడర్ కాన్ఫిగర్ చేయలేదు. ముందుగా setProvider() కాల్ చేయండి.',
  'monitoring.check.database.notBonded': 'డేటాబేస్ బాండ్ కాన్ఫిగర్ చేయలేదు.',
  'monitoring.check.database.poolUnavailable': 'డేటాబేస్ పూల్ అందుబాటులో లేదు.',
  'monitoring.check.cache.notBonded': 'క్యాష్ బాండ్ కాన్ఫిగర్ చేయలేదు.',
  'monitoring.check.cache.providerUnavailable': 'కాష్ ప్రొవైడర్ అందుబాటులో లేదు.',
  'monitoring.check.http.badStatus': 'HTTP {{status}} ప్రతిస్పందన.',
  'monitoring.check.http.timeout': 'అభ్యర్థన సమయం ముగిసింది.',
  'monitoring.check.http.degraded':
    'ప్రతిస్పందన సమయం {{latencyMs}}ms పరిమితి {{thresholdMs}}ms-ను మించిపోయింది.',
  'monitoring.check.bond.notBonded': "Bond '{{bondType}}' నోందణీ చేయలేదు.",
  'monitoring.check.timedOut': '{{timeoutMs}}ms తర్వాత తనిఖీ సమయం ముగిసింది.',
}
