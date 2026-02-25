import type { StatusDashboardTranslations } from './types.js'

/** Status dashboard translations for Mongolian. */
export const mn: StatusDashboardTranslations = {
  'statusDashboard.error.noProvider': 'Статусын хянах самбарын нийлүүлэгч тохируулагдаагүй байна.',
  'statusDashboard.error.fetchFailed': 'Статусыг татахад алдаа гарлаа: HTTP {{status}}',
  'statusDashboard.label.allOperational': 'Бүх системүүд хэвийн ажиллаж байна',
  'statusDashboard.label.someIssues': 'Зарим системүүд асуудалтай байна',
  'statusDashboard.label.majorOutage': 'Системийн томоохон саатал',
  'statusDashboard.label.operational': 'Ажиллаж байна',
  'statusDashboard.label.degraded': 'Муудсан',
  'statusDashboard.label.down': 'Ажиллахгүй байна',
  'statusDashboard.label.unknown': 'Тодорхойгүй',
  'statusDashboard.label.services': 'Үйлчилгээнүүд',
  'statusDashboard.label.incidents': 'Зөрчлүүд',
  'statusDashboard.label.uptime': 'Ажиллах хугацаа',
  'statusDashboard.label.lastChecked': 'Сүүлд шалгасан {{time}}',
  'statusDashboard.label.latency': '{{ms}}ms',
  'statusDashboard.label.noIncidents': 'Ямар ч зөрчил мэдээлэгдээгүй.',
}
