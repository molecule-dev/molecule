import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Turkish. */
export const tr: BodyParserTranslations = {
  'middleware.error.badRequest': 'Geçersiz istek.',
  'middleware.error.fileTooLarge': 'Dosya {{limit}} boyutundan büyük.',
  'middleware.error.fileTypeNotAllowed':
    'Bu dosya türüne izin verilmiyor. İzin verilen türler: {{types}}.',
  'middleware.error.fileMissing': '"{{field}}" alanında bir dosya gönderin.',
  'middleware.error.tooManyFiles': 'Çok fazla dosya. Sınır: {{max}}.',
  'middleware.error.unexpectedFile': 'Dosyayı "{{field}}" değil, "{{expected}}" alanında gönderin.',
  'middleware.error.notMultipart':
    'Dosyayı "{{field}}" alanında multipart/form-data olarak gönderin.',
  'middleware.error.payloadTooLarge': 'İstek çok büyük.',
}
