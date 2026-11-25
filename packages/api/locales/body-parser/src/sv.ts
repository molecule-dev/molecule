import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Swedish. */
export const sv: BodyParserTranslations = {
  'middleware.error.badRequest': 'Ogiltig begäran.',
  'middleware.error.fileTooLarge': 'Filen är större än {{limit}}.',
  'middleware.error.fileTypeNotAllowed':
    'Den här filtypen är inte tillåten. Tillåtna typer: {{types}}.',
  'middleware.error.fileMissing': 'Skicka en fil i fältet "{{field}}".',
  'middleware.error.tooManyFiles': 'För många filer. Gränsen är {{max}}.',
  'middleware.error.unexpectedFile': 'Skicka filen i fältet "{{expected}}", inte "{{field}}".',
  'middleware.error.notMultipart': 'Skicka filen som multipart/form-data i fältet "{{field}}".',
  'middleware.error.payloadTooLarge': 'Begäran är för stor.',
}
