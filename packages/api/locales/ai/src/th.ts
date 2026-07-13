import type { AiTranslations } from './types.js'

/** Ai translations for Thai. */
export const th: AiTranslations = {
  'ai.error.noProvider': 'ยังไม่ได้กำหนดค่าผู้ให้บริการ AI เชื่อมต่อผู้ให้บริการ AI ก่อน',
  'ai.error.apiError': 'คำขอ AI API ล้มเหลว',
  'ai.error.noResponseBody': 'เนื้อหาการตอบกลับ AI ว่างเปล่า',
  'ai.error.ambiguousProvider':
    'มีผู้ให้บริการ AI ที่มีชื่อหลายรายเชื่อมต่ออยู่และไม่ได้ตั้งค่าเริ่มต้น ใช้ getProviderByName(name) เพื่อเลือกหนึ่งราย',
}
