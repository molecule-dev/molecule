import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Albanian. */
export const sq: BodyParserTranslations = {
  'middleware.error.badRequest': 'Kerkese e keqe.',
  'middleware.error.fileTooLarge': 'Skedari është më i madh se {{limit}}.',
  'middleware.error.fileTypeNotAllowed':
    'Ky lloj skedari nuk lejohet. Llojet e lejuara: {{types}}.',
  'middleware.error.fileMissing': 'Dërgoni një skedar në fushën "{{field}}".',
  'middleware.error.tooManyFiles': 'Shumë skedarë. Kufiri është {{max}}.',
  'middleware.error.unexpectedFile': 'Dërgojeni skedarin në fushën "{{expected}}", jo "{{field}}".',
  'middleware.error.notMultipart':
    'Dërgojeni skedarin si multipart/form-data në fushën "{{field}}".',
  'middleware.error.payloadTooLarge': 'Kërkesa është shumë e madhe.',
}
