import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Thai. */
export const th: MarkdownTranslations = {
  'markdown.components.invalid': 'components มีรายการที่ไม่ใช่คอมโพเนนต์ React หรือชื่อ element',
  'markdown.components.unsupported':
    'ผู้ให้บริการ marked ไม่สามารถใช้ components ได้ เนื่องจากส่งคืนสตริง HTML ใช้ elementAttributes เพื่อเพิ่มแอตทริบิวต์',
  'markdown.elementAttributes.invalidName': '"{{name}}" ไม่ใช่ชื่อแอตทริบิวต์ (บน <{{element}}>)',
  'markdown.elementAttributes.refused':
    'elementAttributes ไม่สามารถตั้งค่า "{{name}}" บน <{{element}}> ได้: ตัวเรนเดอร์เป็นเจ้าของ',
  'markdown.elementAttributes.unknownElement':
    'elementAttributes ระบุชื่อ <{{element}}> ซึ่ง markdown ไม่ได้สร้างขึ้น',
  'markdown.footnotes.backToReference': 'กลับไปที่การอ้างอิง {{reference}}',
  'markdown.footnotes.label': 'เชิงอรรถ',
}
