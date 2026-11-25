import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Ukrainian. */
export const uk: BodyParserTranslations = {
  'middleware.error.badRequest': 'Некоректний запит.',
  'middleware.error.fileTooLarge': 'Файл більший за {{limit}}.',
  'middleware.error.fileTypeNotAllowed': 'Цей тип файлу не дозволено. Дозволені типи: {{types}}.',
  'middleware.error.fileMissing': 'Надішліть файл у полі "{{field}}".',
  'middleware.error.tooManyFiles': 'Забагато файлів. Ліміт: {{max}}.',
  'middleware.error.unexpectedFile': 'Надішліть файл у полі "{{expected}}", а не "{{field}}".',
  'middleware.error.notMultipart': 'Надішліть файл як multipart/form-data у полі "{{field}}".',
  'middleware.error.payloadTooLarge': 'Запит завеликий.',
}
