import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Czech. */
export const cs: BodyParserTranslations = {
  'middleware.error.badRequest': 'Chybný požadavek.',
  'middleware.error.fileTooLarge': 'Soubor je větší než {{limit}}.',
  'middleware.error.fileTypeNotAllowed':
    'Tento typ souboru není povolen. Povolené typy: {{types}}.',
  'middleware.error.fileMissing': 'Odešlete soubor v poli "{{field}}".',
  'middleware.error.tooManyFiles': 'Příliš mnoho souborů. Limit je {{max}}.',
  'middleware.error.unexpectedFile': 'Odešlete soubor v poli "{{expected}}", ne "{{field}}".',
  'middleware.error.notMultipart': 'Odešlete soubor jako multipart/form-data v poli "{{field}}".',
  'middleware.error.payloadTooLarge': 'Požadavek je příliš velký.',
}
