import type { StatusDashboardTranslations } from './types.js'

/** Status dashboard translations for Arabic. */
export const ar: StatusDashboardTranslations = {
  'statusDashboard.error.noProvider': 'لم يتم تهيئة مزود لوحة معلومات الحالة.',
  'statusDashboard.error.fetchFailed': 'فشل في جلب الحالة: HTTP {{status}}',
  'statusDashboard.label.allOperational': 'جميع الأنظمة تعمل بشكل طبيعي',
  'statusDashboard.label.someIssues': 'بعض الأنظمة تواجه مشاكل',
  'statusDashboard.label.majorOutage': 'انقطاع كبير في النظام',
  'statusDashboard.label.operational': 'يعمل',
  'statusDashboard.label.degraded': 'متدهور',
  'statusDashboard.label.down': 'متوقف',
  'statusDashboard.label.unknown': 'غير معروف',
  'statusDashboard.label.services': 'الخدمات',
  'statusDashboard.label.incidents': 'الحوادث',
  'statusDashboard.label.uptime': 'وقت التشغيل',
  'statusDashboard.label.lastChecked': 'آخر فحص {{time}}',
  'statusDashboard.label.latency': '{{ms}}ms',
  'statusDashboard.label.noIncidents': 'لم يتم الإبلاغ عن أي حوادث.',
}
