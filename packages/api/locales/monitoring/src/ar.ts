import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Arabic. */
export const ar: MonitoringTranslations = {
  'monitoring.error.noProvider': 'لم يتم تكوين مزود المراقبة. استدعِ setProvider() أولاً.',
  'monitoring.check.database.notBonded': 'لم يتم تكوين رابط قاعدة البيانات.',
  'monitoring.check.database.poolUnavailable': 'تجمع قاعدة البيانات غير متاح.',
  'monitoring.check.cache.notBonded': 'لم يتم تكوين رابط التخزين المؤقت.',
  'monitoring.check.cache.providerUnavailable': 'مزود التخزين المؤقت غير متاح.',
  'monitoring.check.http.badStatus': 'استجابة HTTP {{status}}.',
  'monitoring.check.http.timeout': 'انتهت مهلة الطلب.',
  'monitoring.check.http.degraded':
    'زمن الاستجابة {{latencyMs}}مللي ثانية تجاوز الحد {{thresholdMs}}مللي ثانية.',
  'monitoring.check.bond.notBonded': "الرابط '{{bondType}}' غير مسجل.",
  'monitoring.check.timedOut': 'انتهت مهلة الفحص بعد {{timeoutMs}}مللي ثانية.',
}
