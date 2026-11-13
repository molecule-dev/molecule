import type { ChatTranslations } from './types.js'

/** Ai Chat translations for Thai. */
export const th: ChatTranslations = {
  'chat.error.httpError': 'HTTP {{status}}: {{text}}',
  'chat.error.noResponseBody': 'ไม่มี response body',
  'chat.error.streamError': 'ข้อผิดพลาด stream',
  'chat.error.unknownError': 'ข้อผิดพลาดที่ไม่ทราบสาเหตุ',
  'chat.error.sendFailed': 'ส่งข้อความไม่สำเร็จ',
  'chat.error.stalled':
    '{{agentName}} หยุดตอบสนองแล้ว อาจกำลังดำเนินการประมวลผลอยู่เบื้องหลัง โปรดรีเฟรชหน้าเว็บเพื่อดูสถานะล่าสุด หรือส่งข้อความใหม่',
}
