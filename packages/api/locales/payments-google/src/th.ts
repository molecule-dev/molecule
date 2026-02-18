import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for Thai. */
export const th: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    'ไม่มีชื่อแพ็คเกจ Google Play (process.env.GOOGLE_PLAY_PACKAGE_NAME)',
  'payments.google.warn.missingServiceKey':
    'ไม่มีออบเจ็กต์คีย์บริการ Google API (process.env.GOOGLE_API_SERVICE_KEY_OBJECT)',
  'payments.google.error.serviceKeyNotConfigured':
    'ยังไม่ได้กำหนดค่าออบเจ็กต์คีย์บริการ Google API',
  'payments.google.error.parseServiceKey':
    'ข้อผิดพลาดในการแยกวิเคราะห์ออบเจ็กต์คีย์บริการ Google API:',
}
