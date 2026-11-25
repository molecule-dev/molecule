import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Russian. */
export const ru: BodyParserTranslations = {
  'middleware.error.badRequest': 'Некорректный запрос.',
  'middleware.error.fileTooLarge': 'Файл больше {{limit}}.',
  'middleware.error.fileTypeNotAllowed': 'Этот тип файла не разрешён. Разрешённые типы: {{types}}.',
  'middleware.error.fileMissing': 'Отправьте файл в поле "{{field}}".',
  'middleware.error.tooManyFiles': 'Слишком много файлов. Лимит: {{max}}.',
  'middleware.error.unexpectedFile': 'Отправьте файл в поле "{{expected}}", а не "{{field}}".',
  'middleware.error.notMultipart': 'Отправьте файл как multipart/form-data в поле "{{field}}".',
  'middleware.error.payloadTooLarge': 'Запрос слишком большой.',
}
