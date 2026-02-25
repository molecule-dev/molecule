import type { StatusDashboardTranslations } from './types.js'

/** Status dashboard translations for Urdu. */
export const ur: StatusDashboardTranslations = {
  'statusDashboard.error.noProvider': 'اسٹیٹس ڈیش بورڈ فراہم کنندہ ترتیب نہیں دیا گیا۔',
  'statusDashboard.error.fetchFailed': 'اسٹیٹس حاصل کرنے میں ناکامی: HTTP {{status}}',
  'statusDashboard.label.allOperational': 'تمام سسٹم کام کر رہے ہیں',
  'statusDashboard.label.someIssues': 'کچھ سسٹمز میں مسائل آ رہے ہیں',
  'statusDashboard.label.majorOutage': 'بڑی سسٹم خرابی',
  'statusDashboard.label.operational': 'کام کر رہا ہے',
  'statusDashboard.label.degraded': 'کمزور',
  'statusDashboard.label.down': 'بند',
  'statusDashboard.label.unknown': 'نامعلوم',
  'statusDashboard.label.services': 'خدمات',
  'statusDashboard.label.incidents': 'واقعات',
  'statusDashboard.label.uptime': 'اپ ٹائم',
  'statusDashboard.label.lastChecked': 'آخری جانچ {{time}}',
  'statusDashboard.label.latency': '{{ms}}ms',
  'statusDashboard.label.noIncidents': 'کوئی واقعہ رپورٹ نہیں ہوا۔',
}
