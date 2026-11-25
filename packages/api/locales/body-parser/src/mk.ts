import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Macedonian. */
export const mk: BodyParserTranslations = {
  'middleware.error.badRequest': 'Невалидно барање.',
  'middleware.error.fileTooLarge': 'Датотеката е поголема од {{limit}}.',
  'middleware.error.fileTypeNotAllowed':
    'Овој тип датотека не е дозволен. Дозволени типови: {{types}}.',
  'middleware.error.fileMissing': 'Испратете датотека во полето "{{field}}".',
  'middleware.error.tooManyFiles': 'Премногу датотеки. Ограничувањето е {{max}}.',
  'middleware.error.unexpectedFile':
    'Испратете ја датотеката во полето "{{expected}}", а не "{{field}}".',
  'middleware.error.notMultipart':
    'Испратете ја датотеката како multipart/form-data во полето "{{field}}".',
  'middleware.error.payloadTooLarge': 'Барањето е преголемо.',
}
