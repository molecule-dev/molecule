import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Danish. */
export const da: BodyParserTranslations = {
  'middleware.error.badRequest': 'Ugyldig forespørgsel.',
  'middleware.error.fileTooLarge': 'Filen er større end {{limit}}.',
  'middleware.error.fileTypeNotAllowed':
    'Denne filtype er ikke tilladt. Tilladte typer: {{types}}.',
  'middleware.error.fileMissing': 'Send en fil i feltet "{{field}}".',
  'middleware.error.tooManyFiles': 'For mange filer. Grænsen er {{max}}.',
  'middleware.error.unexpectedFile': 'Send filen i feltet "{{expected}}", ikke "{{field}}".',
  'middleware.error.notMultipart': 'Send filen som multipart/form-data i feltet "{{field}}".',
  'middleware.error.payloadTooLarge': 'Anmodningen er for stor.',
}
