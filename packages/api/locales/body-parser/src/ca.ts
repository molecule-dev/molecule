import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Catalan. */
export const ca: BodyParserTranslations = {
  'middleware.error.badRequest': 'Sol·licitud incorrecta.',
  'middleware.error.fileTooLarge': 'El fitxer és més gran de {{limit}}.',
  'middleware.error.fileTypeNotAllowed':
    'Aquest tipus de fitxer no està permès. Tipus permesos: {{types}}.',
  'middleware.error.fileMissing': 'Envieu un fitxer al camp "{{field}}".',
  'middleware.error.tooManyFiles': 'Massa fitxers. El límit és {{max}}.',
  'middleware.error.unexpectedFile': 'Envieu el fitxer al camp "{{expected}}", no a "{{field}}".',
  'middleware.error.notMultipart':
    'Envieu el fitxer com a multipart/form-data al camp "{{field}}".',
  'middleware.error.payloadTooLarge': 'La sol·licitud és massa gran.',
}
