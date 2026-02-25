import type { StatusTranslations } from './types.js'

/** Status translations for Thai. */
export const th: StatusTranslations = {
  'status.error.serviceNotFound': 'ไม่พบบริการ',
  'status.error.incidentNotFound': 'ไม่พบเหตุการณ์',
  'status.error.validationFailed': 'การตรวจสอบล้มเหลว: {{errors}}',
  'status.error.createServiceFailed': 'สร้างบริการล้มเหลว',
  'status.error.updateServiceFailed': 'อัปเดตบริการล้มเหลว',
  'status.error.deleteServiceFailed': 'ลบบริการล้มเหลว',
  'status.error.getServiceFailed': 'ดึงข้อมูลบริการล้มเหลว',
  'status.error.listServicesFailed': 'แสดงรายการบริการล้มเหลว',
  'status.error.createIncidentFailed': 'สร้างเหตุการณ์ล้มเหลว',
  'status.error.updateIncidentFailed': 'อัปเดตเหตุการณ์ล้มเหลว',
  'status.error.listIncidentsFailed': 'แสดงรายการเหตุการณ์ล้มเหลว',
  'status.error.getStatusFailed': 'ดึงข้อมูลสถานะระบบล้มเหลว',
  'status.error.getUptimeFailed': 'ดึงข้อมูลเวลาทำงานล้มเหลว',
}
