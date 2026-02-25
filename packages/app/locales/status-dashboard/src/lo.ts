import type { StatusDashboardTranslations } from './types.js'

/** Status dashboard translations for Lao. */
export const lo: StatusDashboardTranslations = {
  'statusDashboard.error.noProvider': 'ຜູ້ໃຫ້ບໍລິການແດชບອດສະຖານະບໍ່ໄດ້ຖືກກຳນົດ.',
  'statusDashboard.error.fetchFailed': 'ລົ້ມເຫລວໃນການດຶງສະຖານະ: HTTP {{status}}',
  'statusDashboard.label.allOperational': 'ທຸກລະບົບເຮັດວຽກປົກກະຕິ',
  'statusDashboard.label.someIssues': 'ບາງລະບົບກຳລັງປະສົບບັນຫາ',
  'statusDashboard.label.majorOutage': 'ລະບົບຂັດຂ້ອງຮ້າຍແຮງ',
  'statusDashboard.label.operational': 'ເຮັດວຽກປົກກະຕິ',
  'statusDashboard.label.degraded': 'ຫຼຸດລົງ',
  'statusDashboard.label.down': 'ບໍ່ເຮັດວຽກ',
  'statusDashboard.label.unknown': 'ບໍ່ຮູ້',
  'statusDashboard.label.services': 'ບໍລິການ',
  'statusDashboard.label.incidents': 'ເຫດການ',
  'statusDashboard.label.uptime': 'ເວລາເຮັດວຽກ',
  'statusDashboard.label.lastChecked': 'ກວດສອບຄັ້ງສຸດທ້າຍ {{time}}',
  'statusDashboard.label.latency': '{{ms}}ms',
  'statusDashboard.label.noIncidents': 'ບໍ່ມີເຫດການໃດຖືກລາຍງານ.',
}
