import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Persian. */
export const fa: MonitoringTranslations = {
  'monitoring.error.noProvider':
    'ارائه‌دهنده مانیتورینگ پیکربندی نشده است. ابتدا setProvider() را فراخوانی کنید.',
  'monitoring.check.database.notBonded': 'اتصال پایگاه داده پیکربندی نشده است.',
  'monitoring.check.database.poolUnavailable': 'استخر پایگاه داده در دسترس نیست.',
  'monitoring.check.cache.notBonded': 'اتصال کش پیکربندی نشده است.',
  'monitoring.check.cache.providerUnavailable': 'ارائه‌دهنده حافظه پنهان در دسترس نیست.',
  'monitoring.check.http.badStatus': 'پاسخ HTTP {{status}}.',
  'monitoring.check.http.timeout': 'مهلت درخواست به پایان رسید.',
  'monitoring.check.http.degraded':
    'زمان پاسخ {{latencyMs}}ms از آستانه {{thresholdMs}}ms فراتر رفت.',
  'monitoring.check.bond.notBonded': "اتصال '{{bondType}}' ثبت نشده است.",
  'monitoring.check.timedOut': 'بررسی پس از {{timeoutMs}}ms منقضی شد.',
}
