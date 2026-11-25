import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Slovenian. */
export const sl: BodyParserTranslations = {
  'middleware.error.badRequest': 'Napačna zahteva.',
  'middleware.error.fileTooLarge': 'Datoteka je večja od {{limit}}.',
  'middleware.error.fileTypeNotAllowed':
    'Ta vrsta datoteke ni dovoljena. Dovoljene vrste: {{types}}.',
  'middleware.error.fileMissing': 'Pošljite datoteko v polju "{{field}}".',
  'middleware.error.tooManyFiles': 'Preveč datotek. Omejitev je {{max}}.',
  'middleware.error.unexpectedFile': 'Pošljite datoteko v polju "{{expected}}", ne "{{field}}".',
  'middleware.error.notMultipart': 'Pošljite datoteko kot multipart/form-data v polju "{{field}}".',
  'middleware.error.payloadTooLarge': 'Zahteva je prevelika.',
}
