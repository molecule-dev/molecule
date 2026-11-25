import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Welsh. */
export const cy: BodyParserTranslations = {
  'middleware.error.badRequest': 'Cais gwael.',
  'middleware.error.fileTooLarge': "Mae'r ffeil yn fwy na {{limit}}.",
  'middleware.error.fileTypeNotAllowed':
    'Ni chaniateir y math hwn o ffeil. Mathau a ganiateir: {{types}}.',
  'middleware.error.fileMissing': 'Anfonwch ffeil yn y maes "{{field}}".',
  'middleware.error.tooManyFiles': 'Gormod o ffeiliau. Y terfyn yw {{max}}.',
  'middleware.error.unexpectedFile': 'Anfonwch y ffeil yn y maes "{{expected}}", nid "{{field}}".',
  'middleware.error.notMultipart':
    'Anfonwch y ffeil fel multipart/form-data yn y maes "{{field}}".',
  'middleware.error.payloadTooLarge': "Mae'r cais yn rhy fawr.",
}
