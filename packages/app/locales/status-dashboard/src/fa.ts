import type { StatusDashboardTranslations } from './types.js'

/** Status dashboard translations for Persian. */
export const fa: StatusDashboardTranslations = {
  'statusDashboard.error.noProvider': 'ارائه‌دهنده داشبورد وضعیت پیکربندی نشده است.',
  'statusDashboard.error.fetchFailed': 'دریافت وضعیت ناموفق بود: HTTP {{status}}',
  'statusDashboard.label.allOperational': 'تمام سیستم‌ها عملیاتی هستند',
  'statusDashboard.label.someIssues': 'برخی سیستم‌ها با مشکل مواجه هستند',
  'statusDashboard.label.majorOutage': 'قطعی بزرگ سیستم',
  'statusDashboard.label.operational': 'عملیاتی',
  'statusDashboard.label.degraded': 'کاهش یافته',
  'statusDashboard.label.down': 'از کار افتاده',
  'statusDashboard.label.unknown': 'نامشخص',
  'statusDashboard.label.services': 'خدمات',
  'statusDashboard.label.incidents': 'رخدادها',
  'statusDashboard.label.uptime': 'زمان فعالیت',
  'statusDashboard.label.lastChecked': 'آخرین بررسی {{time}}',
  'statusDashboard.label.latency': '{{ms}}ms',
  'statusDashboard.label.noIncidents': 'هیچ رخدادی گزارش نشده است.',
}
