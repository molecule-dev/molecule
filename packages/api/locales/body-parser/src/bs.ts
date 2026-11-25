import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Bosnian. */
export const bs: BodyParserTranslations = {
  'middleware.error.badRequest': 'Nevažeći zahtjev.',
  'middleware.error.fileTooLarge': 'Datoteka je veća od {{limit}}.',
  'middleware.error.fileTypeNotAllowed':
    'Ova vrsta datoteke nije dozvoljena. Dozvoljene vrste: {{types}}.',
  'middleware.error.fileMissing': 'Pošaljite datoteku u polju "{{field}}".',
  'middleware.error.tooManyFiles': 'Previše datoteka. Ograničenje je {{max}}.',
  'middleware.error.unexpectedFile': 'Pošaljite datoteku u polju "{{expected}}", a ne "{{field}}".',
  'middleware.error.notMultipart':
    'Pošaljite datoteku kao multipart/form-data u polju "{{field}}".',
  'middleware.error.payloadTooLarge': 'Zahtjev je prevelik.',
}
