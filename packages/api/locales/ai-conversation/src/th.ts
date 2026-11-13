import type { ConversationTranslations } from './types.js'

/** Conversation translations for Thai. */
export const th: ConversationTranslations = {
  'conversation.error.messageRequired': 'ต้องระบุ message',
  'conversation.error.aiNotConfigured': 'ยังไม่ได้กำหนดค่า AI provider',
  'conversation.error.unknownAiError': 'ข้อผิดพลาด AI ที่ไม่ทราบสาเหตุ',
  'conversation.error.notFound': 'ไม่พบการสนทนา',
  'conversation.error.streamError': 'ข้อผิดพลาด AI streaming',
  'conversation.error.forbidden': 'การเข้าถึงถูกปฏิเสธ',
  'conversation.error.unauthorized': 'ไม่ได้รับอนุญาต',
  'conversation.error.clearFailed': 'ไม่สามารถเคลียร์บทสนทนาได้',
  'conversation.error.idRequired':
    'จำเป็นต้องระบุ conversationId เมื่อโปรเจกต์มีการสนทนามากกว่าหนึ่งรายการ',
  'conversation.error.historyFailed': 'ไม่สามารถโหลดประวัติการสนทนาได้',
  'conversation.error.readFailed': 'อ่านบทสนทนาไม่เข้าใจ',
  'conversation.error.updateFailed': 'ไม่สามารถอัปเดตบทสนทนาได้',
}
