import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for English. */
export const en: BodyParserTranslations = {
  'middleware.error.badRequest': 'Bad request.',
  'middleware.error.fileTooLarge': 'The file is larger than {{limit}}.',
  'middleware.error.fileTypeNotAllowed': 'This file type is not allowed. Allowed types: {{types}}.',
  'middleware.error.fileMissing': 'Send a file in the "{{field}}" field.',
  'middleware.error.tooManyFiles': 'Too many files. The limit is {{max}}.',
  'middleware.error.unexpectedFile': 'Send the file in the "{{expected}}" field, not "{{field}}".',
  'middleware.error.notMultipart': 'Send the file as multipart/form-data in the "{{field}}" field.',
  'middleware.error.payloadTooLarge': 'The request is too large.',
}
