import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Spanish. */
export const es: BodyParserTranslations = {
  'middleware.error.badRequest': 'Solicitud incorrecta.',
  'middleware.error.fileTooLarge': 'El archivo supera {{limit}}.',
  'middleware.error.fileTypeNotAllowed':
    'Este tipo de archivo no está permitido. Tipos permitidos: {{types}}.',
  'middleware.error.fileMissing': 'Envía un archivo en el campo "{{field}}".',
  'middleware.error.tooManyFiles': 'Demasiados archivos. El límite es {{max}}.',
  'middleware.error.unexpectedFile':
    'Envía el archivo en el campo "{{expected}}", no en "{{field}}".',
  'middleware.error.notMultipart':
    'Envía el archivo como multipart/form-data en el campo "{{field}}".',
  'middleware.error.payloadTooLarge': 'La solicitud es demasiado grande.',
}
