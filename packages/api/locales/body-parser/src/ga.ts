import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Irish. */
export const ga: BodyParserTranslations = {
  'middleware.error.badRequest': 'Droch-iarratas.',
  'middleware.error.fileTooLarge': 'Tá an comhad níos mó ná {{limit}}.',
  'middleware.error.fileTypeNotAllowed':
    'Ní cheadaítear an cineál comhaid seo. Cineálacha ceadaithe: {{types}}.',
  'middleware.error.fileMissing': 'Seol comhad sa réimse "{{field}}".',
  'middleware.error.tooManyFiles': 'An iomarca comhad. Is é {{max}} an teorainn.',
  'middleware.error.unexpectedFile': 'Seol an comhad sa réimse "{{expected}}", ní "{{field}}".',
  'middleware.error.notMultipart': 'Seol an comhad mar multipart/form-data sa réimse "{{field}}".',
  'middleware.error.payloadTooLarge': 'Tá an t-iarratas rómhór.',
}
