import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Icelandic. */
export const is: BodyParserTranslations = {
  'middleware.error.badRequest': 'Ógild beiðni.',
  'middleware.error.fileTooLarge': 'Skráin er stærri en {{limit}}.',
  'middleware.error.fileTypeNotAllowed':
    'Þessi skráartegund er ekki leyfð. Leyfðar tegundir: {{types}}.',
  'middleware.error.fileMissing': 'Sendu skrá í reitnum "{{field}}".',
  'middleware.error.tooManyFiles': 'Of margar skrár. Hámarkið er {{max}}.',
  'middleware.error.unexpectedFile': 'Sendu skrána í reitnum "{{expected}}", ekki "{{field}}".',
  'middleware.error.notMultipart': 'Sendu skrána sem multipart/form-data í reitnum "{{field}}".',
  'middleware.error.payloadTooLarge': 'Beiðnin er of stór.',
}
