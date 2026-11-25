import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Zulu. */
export const zu: BodyParserTranslations = {
  'middleware.error.badRequest': 'Isicelo esingalungile.',
  'middleware.error.fileTooLarge': 'Ifayela likhulu kuno-{{limit}}.',
  'middleware.error.fileTypeNotAllowed':
    'Lolu hlobo lwefayela aluvunyelwe. Izinhlobo ezivunyelwe: {{types}}.',
  'middleware.error.fileMissing': 'Thumela ifayela enkundleni ethi "{{field}}".',
  'middleware.error.tooManyFiles': 'Amafayela maningi kakhulu. Umkhawulo ngu-{{max}}.',
  'middleware.error.unexpectedFile':
    'Thumela ifayela enkundleni ethi "{{expected}}", hhayi "{{field}}".',
  'middleware.error.notMultipart':
    'Thumela ifayela njenge-multipart/form-data enkundleni ethi "{{field}}".',
  'middleware.error.payloadTooLarge': 'Isicelo sikhulu kakhulu.',
}
