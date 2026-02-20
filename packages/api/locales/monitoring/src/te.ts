import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Telugu. */
export const te: MonitoringTranslations = {
  'monitoring.error.noProvider': 'Monitoring provider not configured. Call setProvider() first.',
  'monitoring.check.database.notBonded': 'Database bond not configured.',
  'monitoring.check.database.poolUnavailable': 'డేటాబేస్ పూల్ అందుబాటులో లేదు.',
  'monitoring.check.cache.notBonded': 'Cache bond not configured.',
  'monitoring.check.cache.providerUnavailable': 'కాష్ ప్రొవైడర్ అందుబాటులో లేదు.',
  'monitoring.check.http.badStatus': 'HTTP {{status}} response.',
  'monitoring.check.http.timeout': 'Request timed out.',
  'monitoring.check.http.degraded':
    'ప్రతిస్పందన సమయం {{latencyMs}}ms పరిమితి {{thresholdMs}}ms-ను మించిపోయింది.',
  'monitoring.check.bond.notBonded': "Bond '{{bondType}}' is not registered.",
  'monitoring.check.timedOut': '{{timeoutMs}}ms తర్వాత తనిఖీ సమయం ముగిసింది.',
}
