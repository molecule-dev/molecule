import type { StatusDashboardTranslations } from './types.js'

/** StatusDashboard translations for ar. */
export const ar: Partial<StatusDashboardTranslations> = {
  'statusDashboard.label.operational': 'يعمل',
  'statusDashboard.label.degraded': 'متراجِعة',
  'statusDashboard.label.down': 'متوقّفة',
  'statusDashboard.label.unknown': 'غير معروف',
  'statusDashboard.label.services': 'الخدمات',
  'statusDashboard.label.incidents': 'الحوادث',
  'statusDashboard.label.uptime': 'وقت التشغيل',
  'statusDashboard.error.noProvider': 'لم يتم تكوين موفر لوحة معلومات الحالة.',
  'statusDashboard.error.fetchFailed': 'فشل جلب الحالة: HTTP<x> {{حالة}}</x>',
  'statusDashboard.label.allOperational': 'جميع الأنظمة تعمل',
  'statusDashboard.label.someIssues': 'بعض الأنظمة تواجه مشاكل',
  'statusDashboard.label.majorOutage': 'انقطاع كبير في النظام',
  'statusDashboard.label.lastChecked': 'آخر فحص<x> {{وقت}}</x>',
  'statusDashboard.label.latency': '{{آنسة}} آنسة',
  'statusDashboard.label.noIncidents': 'لم يتم الإبلاغ عن أي حوادث.',
}
