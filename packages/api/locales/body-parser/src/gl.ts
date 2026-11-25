import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Galician. */
export const gl: BodyParserTranslations = {
  'middleware.error.badRequest': 'Solicitude incorrecta.',
  'middleware.error.fileTooLarge': 'O ficheiro é maior de {{limit}}.',
  'middleware.error.fileTypeNotAllowed':
    'Este tipo de ficheiro non está permitido. Tipos permitidos: {{types}}.',
  'middleware.error.fileMissing': 'Envía un ficheiro no campo "{{field}}".',
  'middleware.error.tooManyFiles': 'Demasiados ficheiros. O límite é {{max}}.',
  'middleware.error.unexpectedFile':
    'Envía o ficheiro no campo "{{expected}}", non en "{{field}}".',
  'middleware.error.notMultipart':
    'Envía o ficheiro como multipart/form-data no campo "{{field}}".',
  'middleware.error.payloadTooLarge': 'A solicitude é demasiado grande.',
}
