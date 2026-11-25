import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Belarusian. */
export const be: BodyParserTranslations = {
  'middleware.error.badRequest': 'Няправільны запыт.',
  'middleware.error.fileTooLarge': 'Файл большы за {{limit}}.',
  'middleware.error.fileTypeNotAllowed': 'Гэты тып файла не дазволены. Дазволеныя тыпы: {{types}}.',
  'middleware.error.fileMissing': 'Адпраўце файл у полі "{{field}}".',
  'middleware.error.tooManyFiles': 'Занадта шмат файлаў. Ліміт: {{max}}.',
  'middleware.error.unexpectedFile': 'Адпраўце файл у полі "{{expected}}", а не "{{field}}".',
  'middleware.error.notMultipart': 'Адпраўце файл як multipart/form-data у полі "{{field}}".',
  'middleware.error.payloadTooLarge': 'Запыт занадта вялікі.',
}
