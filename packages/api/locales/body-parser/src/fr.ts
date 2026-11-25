import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for French. */
export const fr: BodyParserTranslations = {
  'middleware.error.badRequest': 'Requête incorrecte.',
  'middleware.error.fileTooLarge': 'Le fichier dépasse {{limit}}.',
  'middleware.error.fileTypeNotAllowed':
    "Ce type de fichier n'est pas autorisé. Types autorisés : {{types}}.",
  'middleware.error.fileMissing': 'Envoyez un fichier dans le champ "{{field}}".',
  'middleware.error.tooManyFiles': 'Trop de fichiers. La limite est de {{max}}.',
  'middleware.error.unexpectedFile':
    'Envoyez le fichier dans le champ "{{expected}}", pas "{{field}}".',
  'middleware.error.notMultipart':
    'Envoyez le fichier en multipart/form-data dans le champ "{{field}}".',
  'middleware.error.payloadTooLarge': 'La requête est trop volumineuse.',
}
