import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Italian. */
export const it: BodyParserTranslations = {
  'middleware.error.badRequest': 'Richiesta non valida.',
  'middleware.error.fileTooLarge': 'Il file supera {{limit}}.',
  'middleware.error.fileTypeNotAllowed':
    'Questo tipo di file non è consentito. Tipi consentiti: {{types}}.',
  'middleware.error.fileMissing': 'Invia un file nel campo "{{field}}".',
  'middleware.error.tooManyFiles': 'Troppi file. Il limite è {{max}}.',
  'middleware.error.unexpectedFile': 'Invia il file nel campo "{{expected}}", non "{{field}}".',
  'middleware.error.notMultipart': 'Invia il file come multipart/form-data nel campo "{{field}}".',
  'middleware.error.payloadTooLarge': 'La richiesta è troppo grande.',
}
