import type { StatusDashboardTranslations } from './types.js'

/** Status dashboard translations for Bengali. */
export const bn: StatusDashboardTranslations = {
  'statusDashboard.error.noProvider': 'স্ট্যাটাস ড্যাশবোর্ড প্রদানকারী কনফিগার করা হয়নি।',
  'statusDashboard.error.fetchFailed': 'স্ট্যাটাস আনতে ব্যর্থ: HTTP {{status}}',
  'statusDashboard.label.allOperational': 'সমস্ত সিস্টেম চালু আছে',
  'statusDashboard.label.someIssues': 'কিছু সিস্টেমে সমস্যা হচ্ছে',
  'statusDashboard.label.majorOutage': 'বড় সিস্টেম বিভ্রাট',
  'statusDashboard.label.operational': 'চালু',
  'statusDashboard.label.degraded': 'অবনতি',
  'statusDashboard.label.down': 'বন্ধ',
  'statusDashboard.label.unknown': 'অজানা',
  'statusDashboard.label.services': 'সেবাসমূহ',
  'statusDashboard.label.incidents': 'ঘটনাসমূহ',
  'statusDashboard.label.uptime': 'আপটাইম',
  'statusDashboard.label.lastChecked': 'সর্বশেষ পরীক্ষা {{time}}',
  'statusDashboard.label.latency': '{{ms}}ms',
  'statusDashboard.label.noIncidents': 'কোনো ঘটনা রিপোর্ট করা হয়নি।',
}
