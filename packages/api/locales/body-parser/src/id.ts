import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Indonesian. */
export const id: BodyParserTranslations = {
  'middleware.error.badRequest': 'Permintaan tidak valid.',
  'middleware.error.fileTooLarge': 'File lebih besar dari {{limit}}.',
  'middleware.error.fileTypeNotAllowed':
    'Jenis file ini tidak diizinkan. Jenis yang diizinkan: {{types}}.',
  'middleware.error.fileMissing': 'Kirim file di kolom "{{field}}".',
  'middleware.error.tooManyFiles': 'Terlalu banyak file. Batasnya adalah {{max}}.',
  'middleware.error.unexpectedFile': 'Kirim file di kolom "{{expected}}", bukan "{{field}}".',
  'middleware.error.notMultipart': 'Kirim file sebagai multipart/form-data di kolom "{{field}}".',
  'middleware.error.payloadTooLarge': 'Permintaan terlalu besar.',
}
