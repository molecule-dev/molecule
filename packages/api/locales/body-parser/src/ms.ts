import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Malay. */
export const ms: BodyParserTranslations = {
  'middleware.error.badRequest': 'Permintaan tidak sah.',
  'middleware.error.fileTooLarge': 'Fail lebih besar daripada {{limit}}.',
  'middleware.error.fileTypeNotAllowed':
    'Jenis fail ini tidak dibenarkan. Jenis yang dibenarkan: {{types}}.',
  'middleware.error.fileMissing': 'Hantar fail dalam medan "{{field}}".',
  'middleware.error.tooManyFiles': 'Terlalu banyak fail. Hadnya ialah {{max}}.',
  'middleware.error.unexpectedFile': 'Hantar fail dalam medan "{{expected}}", bukan "{{field}}".',
  'middleware.error.notMultipart':
    'Hantar fail sebagai multipart/form-data dalam medan "{{field}}".',
  'middleware.error.payloadTooLarge': 'Permintaan terlalu besar.',
}
