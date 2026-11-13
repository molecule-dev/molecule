import type { AiTranslations } from './types.js'

/** Ai translations for Thai. */
export const th: AiTranslations = {
  'ai.error.noProvider': 'ยังไม่ได้กำหนดค่าผู้ให้บริการ AI เชื่อมต่อผู้ให้บริการ AI ก่อน',
  'ai.error.ambiguousProvider':
    'มีผู้ให้บริการ AI ที่มีชื่อหลายรายเชื่อมต่ออยู่และไม่ได้ตั้งค่าเริ่มต้น ใช้ getProviderByName(name) เพื่อเลือกหนึ่งราย',
  'ai.error.responseIncomplete': 'ระบบ AI ตอบสนองก่อนที่จะเสร็จสมบูรณ์ โปรดลองอีกครั้ง',
  'ai.error.responseTokenLimit':
    'ระบบ AI ตอบสนองถึงขีดจำกัดจำนวนโทเค็นเอาต์พุตก่อนที่จะเสร็จสมบูรณ์',
  'ai.error.apiError': 'เกิดข้อผิดพลาดในการให้บริการ AI โปรดลองใหม่อีกครั้ง',
  'ai.error.noResponseBody': 'ไม่มีการตอบสนองจากบริการ AI',
}
