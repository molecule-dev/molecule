import type { ConfigTranslations } from './types.js'

/** Config translations for Thai. */
export const th: ConfigTranslations = {
  'config.error.required': "การกำหนดค่าที่จำเป็น '{{key}}' ไม่ได้ตั้งค่า",
  'config.error.mustBeNumber': "การกำหนดค่า '{{key}}' ต้องเป็นตัวเลข",
  'config.error.minValue': "การกำหนดค่า '{{key}}' ต้องมีค่าอย่างน้อย {{min}}",
  'config.error.maxValue': "การกำหนดค่า '{{key}}' ต้องมีค่าไม่เกิน {{max}}",
  'config.error.mustBeBoolean': "การกำหนดค่า '{{key}}' ต้องเป็นค่าบูลีน (true/false/1/0)",
  'config.error.mustBeJson': "การกำหนดค่า '{{key}}' ต้องเป็น JSON ที่ถูกต้อง",
  'config.error.patternMismatch': "การกำหนดค่า '{{key}}' ไม่ตรงกับรูปแบบ '{{pattern}}'",
  'config.error.invalidEnum': "การกำหนดค่า '{{key}}' ต้องเป็นหนึ่งใน: {{values}}",
  'config.error.validationNotSupported':
    'ผู้ให้บริการการกำหนดค่าปัจจุบันไม่รองรับการตรวจสอบความถูกต้อง',
}
