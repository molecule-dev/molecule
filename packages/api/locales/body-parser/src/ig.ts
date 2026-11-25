import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Igbo. */
export const ig: BodyParserTranslations = {
  'middleware.error.badRequest': 'Arịrịọ ọjọọ.',
  'middleware.error.fileTooLarge': 'Faịlụ ahụ karịrị {{limit}}.',
  'middleware.error.fileTypeNotAllowed': 'Anaghị ekwe ụdị faịlụ a. Ụdị ndị a na-ekwe: {{types}}.',
  'middleware.error.fileMissing': 'Zipu faịlụ n\'ubi "{{field}}".',
  'middleware.error.tooManyFiles': 'Faịlụ dị ukwuu. Oke ya bụ {{max}}.',
  'middleware.error.unexpectedFile': 'Zipu faịlụ ahụ n\'ubi "{{expected}}", ọ bụghị "{{field}}".',
  'middleware.error.notMultipart': 'Zipu faịlụ ahụ dị ka multipart/form-data n\'ubi "{{field}}".',
  'middleware.error.payloadTooLarge': 'Arịrịọ ahụ buru ibu nke ukwuu.',
}
