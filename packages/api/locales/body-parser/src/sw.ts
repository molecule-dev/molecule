import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Swahili. */
export const sw: BodyParserTranslations = {
  'middleware.error.badRequest': 'Ombi batili.',
  'middleware.error.fileTooLarge': 'Faili ni kubwa kuliko {{limit}}.',
  'middleware.error.fileTypeNotAllowed':
    'Aina hii ya faili hairuhusiwi. Aina zinazoruhusiwa: {{types}}.',
  'middleware.error.fileMissing': 'Tuma faili katika sehemu ya "{{field}}".',
  'middleware.error.tooManyFiles': 'Faili ni nyingi mno. Kikomo ni {{max}}.',
  'middleware.error.unexpectedFile': 'Tuma faili katika sehemu ya "{{expected}}", si "{{field}}".',
  'middleware.error.notMultipart':
    'Tuma faili kama multipart/form-data katika sehemu ya "{{field}}".',
  'middleware.error.payloadTooLarge': 'Ombi ni kubwa mno.',
}
