import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Khmer. */
export const km: BodyParserTranslations = {
  'middleware.error.badRequest': 'សំណើមិនត្រឹមត្រូវ។',
  'middleware.error.fileTooLarge': 'ឯកសារធំជាង {{limit}}។',
  'middleware.error.fileTypeNotAllowed':
    'ប្រភេទឯកសារនេះមិនត្រូវបានអនុញ្ញាតទេ។ ប្រភេទដែលបានអនុញ្ញាត៖ {{types}}។',
  'middleware.error.fileMissing': 'ផ្ញើឯកសារក្នុងវាល "{{field}}"។',
  'middleware.error.tooManyFiles': 'ឯកសារច្រើនពេក។ ដែនកំណត់គឺ {{max}}។',
  'middleware.error.unexpectedFile': 'ផ្ញើឯកសារក្នុងវាល "{{expected}}" មិនមែន "{{field}}" ទេ។',
  'middleware.error.notMultipart': 'ផ្ញើឯកសារជា multipart/form-data ក្នុងវាល "{{field}}"។',
  'middleware.error.payloadTooLarge': 'សំណើធំពេក។',
}
