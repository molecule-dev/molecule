import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Maltese. */
export const mt: BodyParserTranslations = {
  'middleware.error.badRequest': 'Talba hazina.',
  'middleware.error.fileTooLarge': 'Il-fajl huwa akbar minn {{limit}}.',
  'middleware.error.fileTypeNotAllowed':
    "Dan it-tip ta' fajl mhuwiex permess. Tipi permessi: {{types}}.",
  'middleware.error.fileMissing': 'Ibgħat fajl fil-qasam "{{field}}".',
  'middleware.error.tooManyFiles': 'Wisq fajls. Il-limitu huwa {{max}}.',
  'middleware.error.unexpectedFile': 'Ibgħat il-fajl fil-qasam "{{expected}}", mhux "{{field}}".',
  'middleware.error.notMultipart':
    'Ibgħat il-fajl bħala multipart/form-data fil-qasam "{{field}}".',
  'middleware.error.payloadTooLarge': 'It-talba hija kbira wisq.',
}
