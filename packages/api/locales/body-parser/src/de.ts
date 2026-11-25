import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for German. */
export const de: BodyParserTranslations = {
  'middleware.error.badRequest': 'Ungültige Anfrage.',
  'middleware.error.fileTooLarge': 'Die Datei ist größer als {{limit}}.',
  'middleware.error.fileTypeNotAllowed':
    'Dieser Dateityp ist nicht erlaubt. Erlaubte Typen: {{types}}.',
  'middleware.error.fileMissing': 'Senden Sie eine Datei im Feld "{{field}}".',
  'middleware.error.tooManyFiles': 'Zu viele Dateien. Das Limit ist {{max}}.',
  'middleware.error.unexpectedFile':
    'Senden Sie die Datei im Feld "{{expected}}", nicht "{{field}}".',
  'middleware.error.notMultipart':
    'Senden Sie die Datei als multipart/form-data im Feld "{{field}}".',
  'middleware.error.payloadTooLarge': 'Die Anfrage ist zu groß.',
}
