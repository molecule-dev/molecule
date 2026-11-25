import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Bulgarian. */
export const bg: BodyParserTranslations = {
  'middleware.error.badRequest': 'Невалидна заявка.',
  'middleware.error.fileTooLarge': 'Файлът е по-голям от {{limit}}.',
  'middleware.error.fileTypeNotAllowed':
    'Този тип файл не е разрешен. Разрешени типове: {{types}}.',
  'middleware.error.fileMissing': 'Изпратете файл в полето "{{field}}".',
  'middleware.error.tooManyFiles': 'Твърде много файлове. Ограничението е {{max}}.',
  'middleware.error.unexpectedFile': 'Изпратете файла в полето "{{expected}}", а не в "{{field}}".',
  'middleware.error.notMultipart': 'Изпратете файла като multipart/form-data в полето "{{field}}".',
  'middleware.error.payloadTooLarge': 'Заявката е твърде голяма.',
}
