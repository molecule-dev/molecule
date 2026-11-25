import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Estonian. */
export const et: BodyParserTranslations = {
  'middleware.error.badRequest': 'Vigane päring.',
  'middleware.error.fileTooLarge': 'Fail on suurem kui {{limit}}.',
  'middleware.error.fileTypeNotAllowed': 'See failitüüp pole lubatud. Lubatud tüübid: {{types}}.',
  'middleware.error.fileMissing': 'Saatke fail väljal "{{field}}".',
  'middleware.error.tooManyFiles': 'Liiga palju faile. Piirang on {{max}}.',
  'middleware.error.unexpectedFile': 'Saatke fail väljal "{{expected}}", mitte "{{field}}".',
  'middleware.error.notMultipart': 'Saatke fail multipart/form-data vormingus väljal "{{field}}".',
  'middleware.error.payloadTooLarge': 'Päring on liiga suur.',
}
