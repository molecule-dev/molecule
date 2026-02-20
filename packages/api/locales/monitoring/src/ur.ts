import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Urdu. */
export const ur: MonitoringTranslations = {
  'monitoring.error.noProvider': 'Monitoring provider not configured. Call setProvider() first.',
  'monitoring.check.database.notBonded': 'Database bond not configured.',
  'monitoring.check.database.poolUnavailable': 'ڈیٹابیس پول دستیاب نہیں ہے۔',
  'monitoring.check.cache.notBonded': 'Cache bond not configured.',
  'monitoring.check.cache.providerUnavailable': 'کیش فراہم کنندہ دستیاب نہیں ہے۔',
  'monitoring.check.http.badStatus': 'HTTP {{status}} response.',
  'monitoring.check.http.timeout': 'Request timed out.',
  'monitoring.check.http.degraded':
    'جوابی وقت {{latencyMs}}ms حد {{thresholdMs}}ms سے تجاوز کر گیا۔',
  'monitoring.check.bond.notBonded': "Bond '{{bondType}}' is not registered.",
  'monitoring.check.timedOut': '{{timeoutMs}}ms کے بعد جانچ کا وقت ختم ہو گیا۔',
}
