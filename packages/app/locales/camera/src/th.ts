import type { CameraTranslations } from './types.js'

/** Camera translations for Thai. */
export const th: CameraTranslations = {
  'camera.error.canvasContext': 'ไม่สามารถรับ canvas context ได้',
  'camera.error.noFileSelected': 'ไม่ได้เลือกไฟล์',
  'camera.error.noFilesSelected': 'ไม่ได้เลือกไฟล์',
  'camera.error.failedToReadFile': 'อ่านไฟล์ไม่สำเร็จ',
  'camera.error.videoNotSupported':
    'ไม่รองรับการบันทึกวิดีโอใน web provider ใช้ native provider แทน',
  'camera.error.previewNotStarted': 'ยังไม่ได้เริ่มแสดงตัวอย่าง',
  'camera.error.previewNoParent': 'ตัวอย่างไม่มี parent',
  'camera.error.noVideoTrack': 'ไม่มี video track',
}
