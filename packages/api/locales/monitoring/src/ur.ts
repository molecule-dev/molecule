import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Urdu. */
export const ur: MonitoringTranslations = {
  'monitoring.error.noProvider':
    'مانیٹرنگ فراہم کنندہ تشکیل نہیں دیا گیا۔ پہلے setProvider() کال کریں۔',
  'monitoring.check.database.notBonded': 'ڈیٹابیس بانڈ تشکیل نہیں دیا گیا۔',
  'monitoring.check.database.poolUnavailable': 'ڈیٹابیس پول دستیاب نہیں ہے۔',
  'monitoring.check.cache.notBonded': 'کیش بانڈ تشکیل نہیں دیا گیا۔',
  'monitoring.check.cache.providerUnavailable': 'کیش فراہم کنندہ دستیاب نہیں ہے۔',
  'monitoring.check.http.badStatus': 'HTTP {{status}} جواب۔',
  'monitoring.check.http.timeout': 'درخواست کا وقت ختم ہو گیا۔',
  'monitoring.check.http.degraded':
    'جوابی وقت {{latencyMs}}ms حد {{thresholdMs}}ms سے تجاوز کر گیا۔',
  'monitoring.check.bond.notBonded': "Bond '{{bondType}}' رجسٹرڈ نہیں ہے۔",
  'monitoring.check.timedOut': '{{timeoutMs}}ms کے بعد جانچ کا وقت ختم ہو گیا۔',
}
