import type { TrashTranslations } from './types.js'

/** Trash translations for Thai. */
export const th: TrashTranslations = {
  'trash.error.alreadyResolved': 'รายการที่ถูกลบได้รับการกู้คืนหรือลบถาวรไปแล้ว',
  'trash.error.countFailed': 'นับรายการที่ถูกลบไม่สำเร็จ',
  'trash.error.listFailed': 'แสดงรายการที่ถูกลบไม่สำเร็จ',
  'trash.error.missingId': 'ต้องระบุ ID ถังขยะ',
  'trash.error.missingResource': 'ต้องระบุประเภทและ ID ของทรัพยากร',
  'trash.error.notFound': 'ไม่พบรายการที่ถูกลบ',
  'trash.error.noRestoreHandler': 'ไม่มีตัวจัดการการกู้คืนที่ลงทะเบียนไว้สำหรับทรัพยากรประเภทนี้',
  'trash.error.purgeFailed': 'ลบรายการที่ถูกลบอย่างถาวรไม่สำเร็จ',
  'trash.error.readFailed': 'อ่านรายการที่ถูกลบไม่สำเร็จ',
  'trash.error.restoreFailed': 'กู้คืนรายการที่ถูกลบไม่สำเร็จ',
  'trash.error.trashFailed': 'ย้ายรายการไปยังถังขยะไม่สำเร็จ',
  'trash.error.validationFailed': 'การตรวจสอบไม่สำเร็จ',
}
