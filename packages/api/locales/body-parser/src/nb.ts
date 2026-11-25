import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Norwegian Bokmål. */
export const nb: BodyParserTranslations = {
  'middleware.error.badRequest': 'Ugyldig forespørsel.',
  'middleware.error.fileTooLarge': 'Filen er større enn {{limit}}.',
  'middleware.error.fileTypeNotAllowed':
    'Denne filtypen er ikke tillatt. Tillatte typer: {{types}}.',
  'middleware.error.fileMissing': 'Send en fil i feltet "{{field}}".',
  'middleware.error.tooManyFiles': 'For mange filer. Grensen er {{max}}.',
  'middleware.error.unexpectedFile': 'Send filen i feltet "{{expected}}", ikke "{{field}}".',
  'middleware.error.notMultipart': 'Send filen som multipart/form-data i feltet "{{field}}".',
  'middleware.error.payloadTooLarge': 'Forespørselen er for stor.',
}
