import type { MessageTranslations } from './types.js'

/** Message resource translations for Thai. */
export const th: MessageTranslations = {
  'message.error.deleteFailed': 'ลบข้อความไม่สำเร็จ',
  'message.error.editFailed': 'แก้ไขข้อความไม่สำเร็จ',
  'message.error.listMessagesFailed': 'แสดงรายการข้อความไม่สำเร็จ',
  'message.error.listThreadsFailed': 'แสดงรายการการสนทนาไม่สำเร็จ',
  'message.error.markReadFailed': 'ทำเครื่องหมายการสนทนาว่าอ่านแล้วไม่สำเร็จ',
  'message.error.messageNotFound': 'ไม่พบข้อความหรือไม่สามารถแก้ไขได้',
  'message.error.missingMessageId': 'ต้องระบุ ID ข้อความ',
  'message.error.missingThreadId': 'ต้องระบุ ID การสนทนา',
  'message.error.notParticipant': 'คุณไม่ใช่ผู้เข้าร่วมในการสนทนานี้',
  'message.error.readThreadFailed': 'อ่านการสนทนาไม่สำเร็จ',
  'message.error.selfThread': 'คุณไม่สามารถเริ่มการสนทนากับตัวเองได้',
  'message.error.sendFailed': 'ส่งข้อความไม่สำเร็จ',
  'message.error.threadCreateFailed': 'สร้างการสนทนาไม่สำเร็จ',
  'message.error.threadNotFound': 'ไม่พบการสนทนา',
  'message.error.unreadCountFailed': 'รับจำนวนที่ยังไม่ได้อ่านไม่สำเร็จ',
  'message.error.validationFailed': 'การตรวจสอบไม่สำเร็จ',
  'message.system.conversationStarted': '{{name}} เริ่มการสนทนา',
  'message.system.messageDeleted': 'ข้อความนี้ถูกลบแล้ว',
}
