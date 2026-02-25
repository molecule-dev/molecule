import type { StatusDashboardTranslations } from './types.js'

/** Status dashboard translations for Uzbek. */
export const uz: StatusDashboardTranslations = {
  'statusDashboard.error.noProvider': 'Holat paneli provayderi sozlanmagan.',
  'statusDashboard.error.fetchFailed': 'Holatni olishda xatolik: HTTP {{status}}',
  'statusDashboard.label.allOperational': 'Barcha tizimlar ishlayapti',
  'statusDashboard.label.someIssues': 'Ayrim tizimlarda muammolar mavjud',
  'statusDashboard.label.majorOutage': 'Katta tizim uzilishi',
  'statusDashboard.label.operational': 'Ishlayapti',
  'statusDashboard.label.degraded': 'Yomonlashgan',
  'statusDashboard.label.down': 'Ishlamayapti',
  'statusDashboard.label.unknown': 'Noaniq',
  'statusDashboard.label.services': 'Xizmatlar',
  'statusDashboard.label.incidents': 'Hodisalar',
  'statusDashboard.label.uptime': 'Ishlash vaqti',
  'statusDashboard.label.lastChecked': 'Oxirgi tekshiruv {{time}}',
  'statusDashboard.label.latency': '{{ms}}ms',
  'statusDashboard.label.noIncidents': 'Hech qanday hodisa xabar qilinmagan.',
}
