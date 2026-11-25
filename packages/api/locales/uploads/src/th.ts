import type { UploadsTranslations } from './types.js'

/** Uploads translations for Thai. */
export const th: UploadsTranslations = {
  'uploads.error.noProvider': 'ผู้ให้บริการอัปโหลดยังไม่ได้กำหนดค่า กรุณาเรียก setProvider() ก่อน',
  'uploads.error.streamLimitReached': 'ถึงขีดจำกัดของสตรีมแล้ว',
  'uploads.error.aborted': 'การอัปโหลดถูกยกเลิก',
  'uploads.error.fileTypeBlocked': 'ไม่สามารถอัปโหลดไฟล์ประเภท {{type}} ได้',
  'uploads.error.activeTypeListed':
    'receiveUploads() ระบุ {{type}} ซึ่งเป็นประเภทที่เบราว์เซอร์เรียกใช้ ส่ง allowActiveTypes: true เพื่อจัดเก็บ และให้บริการไฟล์เหล่านั้นด้วย sendUpload()',
}
