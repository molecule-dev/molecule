import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Azerbaijani. */
export const az: BodyParserTranslations = {
  'middleware.error.badRequest': 'Yanlış sorğu.',
  'middleware.error.fileTooLarge': 'Fayl {{limit}} həddindən böyükdür.',
  'middleware.error.fileTypeNotAllowed':
    'Bu fayl növünə icazə verilmir. İcazə verilən növlər: {{types}}.',
  'middleware.error.fileMissing': '"{{field}}" sahəsində fayl göndərin.',
  'middleware.error.tooManyFiles': 'Fayl sayı çoxdur. Limit: {{max}}.',
  'middleware.error.unexpectedFile': 'Faylı "{{field}}" deyil, "{{expected}}" sahəsində göndərin.',
  'middleware.error.notMultipart': 'Faylı "{{field}}" sahəsində multipart/form-data kimi göndərin.',
  'middleware.error.payloadTooLarge': 'Sorğu çox böyükdür.',
}
