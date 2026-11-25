import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Slovak. */
export const sk: BodyParserTranslations = {
  'middleware.error.badRequest': 'Chybná požiadavka.',
  'middleware.error.fileTooLarge': 'Súbor je väčší ako {{limit}}.',
  'middleware.error.fileTypeNotAllowed':
    'Tento typ súboru nie je povolený. Povolené typy: {{types}}.',
  'middleware.error.fileMissing': 'Odošlite súbor v poli "{{field}}".',
  'middleware.error.tooManyFiles': 'Príliš veľa súborov. Limit je {{max}}.',
  'middleware.error.unexpectedFile': 'Odošlite súbor v poli "{{expected}}", nie "{{field}}".',
  'middleware.error.notMultipart': 'Odošlite súbor ako multipart/form-data v poli "{{field}}".',
  'middleware.error.payloadTooLarge': 'Požiadavka je príliš veľká.',
}
