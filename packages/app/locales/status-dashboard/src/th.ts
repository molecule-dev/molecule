import type { StatusDashboardTranslations } from './types.js'

/** Status dashboard translations for Thai. */
export const th: StatusDashboardTranslations = {
  'statusDashboard.error.fetchFailed': 'ไม่สามารถดึงสถานะได้: HTTP {{status}}',
  'statusDashboard.label.allOperational': 'ระบบทั้งหมดทำงานปกติ',
  'statusDashboard.label.someIssues': 'บางระบบกำลังประสบปัญหา',
  'statusDashboard.label.majorOutage': 'ระบบขัดข้องร้ายแรง',
  'statusDashboard.label.operational': 'ทำงานปกติ',
  'statusDashboard.label.degraded': 'ประสิทธิภาพลดลง',
  'statusDashboard.label.down': 'หยุดทำงาน',
  'statusDashboard.label.unknown': 'ไม่ทราบ',
  'statusDashboard.label.services': 'บริการ',
  'statusDashboard.label.incidents': 'เหตุการณ์',
  'statusDashboard.label.uptime': 'เวลาทำงาน',
  'statusDashboard.label.lastChecked': 'ตรวจสอบล่าสุด {{time}}',
  'statusDashboard.label.latency': '{{ms}}ms',
  'statusDashboard.label.noIncidents': 'ไม่มีเหตุการณ์ที่รายงาน',
  'statusDashboard.error.noProvider':
    'ผู้ให้บริการแดชบอร์ดสถานะยังไม่ได้กำหนดค่า โปรดเชื่อมต่อผู้ให้บริการแดชบอร์ดสถานะก่อน',
}
