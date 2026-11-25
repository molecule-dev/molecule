import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Serbian. */
export const sr: BodyParserTranslations = {
  'middleware.error.badRequest': 'Неважећи захтев.',
  'middleware.error.fileTooLarge': 'Датотека је већа од {{limit}}.',
  'middleware.error.fileTypeNotAllowed':
    'Ова врста датотеке није дозвољена. Дозвољене врсте: {{types}}.',
  'middleware.error.fileMissing': 'Пошаљите датотеку у пољу "{{field}}".',
  'middleware.error.tooManyFiles': 'Превише датотека. Ограничење је {{max}}.',
  'middleware.error.unexpectedFile': 'Пошаљите датотеку у пољу "{{expected}}", а не "{{field}}".',
  'middleware.error.notMultipart': 'Пошаљите датотеку као multipart/form-data у пољу "{{field}}".',
  'middleware.error.payloadTooLarge': 'Захтев је превелик.',
}
