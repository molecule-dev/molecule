import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Thai. */
export const th: BodyParserTranslations = {
  'middleware.error.badRequest': 'คำขอไม่ถูกต้อง',
  'middleware.error.fileTooLarge': 'ไฟล์มีขนาดใหญ่กว่า {{limit}}',
  'middleware.error.fileTypeNotAllowed': 'ไม่อนุญาตไฟล์ประเภทนี้ ประเภทที่อนุญาต: {{types}}',
  'middleware.error.fileMissing': 'ส่งไฟล์ในช่อง "{{field}}"',
  'middleware.error.tooManyFiles': 'ไฟล์มากเกินไป ขีดจำกัดคือ {{max}}',
  'middleware.error.unexpectedFile': 'ส่งไฟล์ในช่อง "{{expected}}" ไม่ใช่ "{{field}}"',
  'middleware.error.notMultipart': 'ส่งไฟล์เป็น multipart/form-data ในช่อง "{{field}}"',
  'middleware.error.payloadTooLarge': 'คำขอมีขนาดใหญ่เกินไป',
}
