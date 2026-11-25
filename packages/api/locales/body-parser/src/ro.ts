import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Romanian. */
export const ro: BodyParserTranslations = {
  'middleware.error.badRequest': 'Cerere invalidă.',
  'middleware.error.fileTooLarge': 'Fișierul este mai mare de {{limit}}.',
  'middleware.error.fileTypeNotAllowed':
    'Acest tip de fișier nu este permis. Tipuri permise: {{types}}.',
  'middleware.error.fileMissing': 'Trimiteți un fișier în câmpul "{{field}}".',
  'middleware.error.tooManyFiles': 'Prea multe fișiere. Limita este {{max}}.',
  'middleware.error.unexpectedFile': 'Trimiteți fișierul în câmpul "{{expected}}", nu "{{field}}".',
  'middleware.error.notMultipart':
    'Trimiteți fișierul ca multipart/form-data în câmpul "{{field}}".',
  'middleware.error.payloadTooLarge': 'Cererea este prea mare.',
}
