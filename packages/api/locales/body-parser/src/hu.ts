import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Hungarian. */
export const hu: BodyParserTranslations = {
  'middleware.error.badRequest': 'Hibás kérés.',
  'middleware.error.fileTooLarge': 'A fájl nagyobb, mint {{limit}}.',
  'middleware.error.fileTypeNotAllowed':
    'Ez a fájltípus nem engedélyezett. Engedélyezett típusok: {{types}}.',
  'middleware.error.fileMissing': 'Küldjön egy fájlt a(z) "{{field}}" mezőben.',
  'middleware.error.tooManyFiles': 'Túl sok fájl. A korlát {{max}}.',
  'middleware.error.unexpectedFile':
    'A fájlt a(z) "{{expected}}" mezőben küldje, ne a(z) "{{field}}" mezőben.',
  'middleware.error.notMultipart':
    'A fájlt multipart/form-data formában küldje a(z) "{{field}}" mezőben.',
  'middleware.error.payloadTooLarge': 'A kérés túl nagy.',
}
