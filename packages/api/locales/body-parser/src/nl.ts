import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Dutch. */
export const nl: BodyParserTranslations = {
  'middleware.error.badRequest': 'Ongeldig verzoek.',
  'middleware.error.fileTooLarge': 'Het bestand is groter dan {{limit}}.',
  'middleware.error.fileTypeNotAllowed':
    'Dit bestandstype is niet toegestaan. Toegestane typen: {{types}}.',
  'middleware.error.fileMissing': 'Stuur een bestand in het veld "{{field}}".',
  'middleware.error.tooManyFiles': 'Te veel bestanden. De limiet is {{max}}.',
  'middleware.error.unexpectedFile':
    'Stuur het bestand in het veld "{{expected}}", niet "{{field}}".',
  'middleware.error.notMultipart':
    'Stuur het bestand als multipart/form-data in het veld "{{field}}".',
  'middleware.error.payloadTooLarge': 'Het verzoek is te groot.',
}
