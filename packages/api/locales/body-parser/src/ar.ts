import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Arabic. */
export const ar: BodyParserTranslations = {
  'middleware.error.badRequest': 'طلب غير صالح.',
  'middleware.error.fileTooLarge': 'الملف أكبر من {{limit}}.',
  'middleware.error.fileTypeNotAllowed':
    'نوع الملف هذا غير مسموح به. الأنواع المسموح بها: {{types}}.',
  'middleware.error.fileMissing': 'أرسل ملفًا في الحقل "{{field}}".',
  'middleware.error.tooManyFiles': 'عدد الملفات كبير جدًا. الحد الأقصى هو {{max}}.',
  'middleware.error.unexpectedFile': 'أرسل الملف في الحقل "{{expected}}"، وليس "{{field}}".',
  'middleware.error.notMultipart': 'أرسل الملف بتنسيق multipart/form-data في الحقل "{{field}}".',
  'middleware.error.payloadTooLarge': 'الطلب كبير جدًا.',
}
