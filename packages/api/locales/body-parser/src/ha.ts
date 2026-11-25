import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Hausa. */
export const ha: BodyParserTranslations = {
  'middleware.error.badRequest': 'Buƙatar da ba ta dace ba.',
  'middleware.error.fileTooLarge': 'Fayil ɗin ya fi {{limit}} girma.',
  'middleware.error.fileTypeNotAllowed':
    "Ba a yarda da irin wannan fayil ba. Nau'o'in da aka yarda: {{types}}.",
  'middleware.error.fileMissing': 'Aika fayil a cikin filin "{{field}}".',
  'middleware.error.tooManyFiles': 'Fayiloli sun yi yawa. Iyakar shi ne {{max}}.',
  'middleware.error.unexpectedFile':
    'Aika fayil ɗin a cikin filin "{{expected}}", ba "{{field}}" ba.',
  'middleware.error.notMultipart':
    'Aika fayil ɗin a matsayin multipart/form-data a cikin filin "{{field}}".',
  'middleware.error.payloadTooLarge': 'Buƙatar ta yi girma sosai.',
}
