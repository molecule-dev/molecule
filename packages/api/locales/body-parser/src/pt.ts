import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Portuguese. */
export const pt: BodyParserTranslations = {
  'middleware.error.badRequest': 'Pedido inválido.',
  'middleware.error.fileTooLarge': 'O arquivo é maior que {{limit}}.',
  'middleware.error.fileTypeNotAllowed':
    'Este tipo de arquivo não é permitido. Tipos permitidos: {{types}}.',
  'middleware.error.fileMissing': 'Envie um arquivo no campo "{{field}}".',
  'middleware.error.tooManyFiles': 'Arquivos demais. O limite é {{max}}.',
  'middleware.error.unexpectedFile': 'Envie o arquivo no campo "{{expected}}", não em "{{field}}".',
  'middleware.error.notMultipart': 'Envie o arquivo como multipart/form-data no campo "{{field}}".',
  'middleware.error.payloadTooLarge': 'A solicitação é grande demais.',
}
