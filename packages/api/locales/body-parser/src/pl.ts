import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Polish. */
export const pl: BodyParserTranslations = {
  'middleware.error.badRequest': 'Nieprawidłowe żądanie.',
  'middleware.error.fileTooLarge': 'Plik jest większy niż {{limit}}.',
  'middleware.error.fileTypeNotAllowed':
    'Ten typ pliku jest niedozwolony. Dozwolone typy: {{types}}.',
  'middleware.error.fileMissing': 'Wyślij plik w polu "{{field}}".',
  'middleware.error.tooManyFiles': 'Zbyt wiele plików. Limit wynosi {{max}}.',
  'middleware.error.unexpectedFile': 'Wyślij plik w polu "{{expected}}", a nie "{{field}}".',
  'middleware.error.notMultipart': 'Wyślij plik jako multipart/form-data w polu "{{field}}".',
  'middleware.error.payloadTooLarge': 'Żądanie jest zbyt duże.',
}
