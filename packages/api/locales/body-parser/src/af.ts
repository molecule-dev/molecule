import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Afrikaans. */
export const af: BodyParserTranslations = {
  'middleware.error.badRequest': 'Ongeldige versoek.',
  'middleware.error.fileTooLarge': 'Die lêer is groter as {{limit}}.',
  'middleware.error.fileTypeNotAllowed':
    'Hierdie lêertipe word nie toegelaat nie. Toegelate tipes: {{types}}.',
  'middleware.error.fileMissing': 'Stuur \'n lêer in die "{{field}}"-veld.',
  'middleware.error.tooManyFiles': 'Te veel lêers. Die limiet is {{max}}.',
  'middleware.error.unexpectedFile':
    'Stuur die lêer in die "{{expected}}"-veld, nie "{{field}}" nie.',
  'middleware.error.notMultipart': 'Stuur die lêer as multipart/form-data in die "{{field}}"-veld.',
  'middleware.error.payloadTooLarge': 'Die versoek is te groot.',
}
