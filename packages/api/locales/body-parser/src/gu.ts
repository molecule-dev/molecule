import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Gujarati. */
export const gu: BodyParserTranslations = {
  'middleware.error.badRequest': 'ખરાબ વિનંતી.',
  'middleware.error.fileTooLarge': 'ફાઇલ {{limit}} કરતાં મોટી છે.',
  'middleware.error.fileTypeNotAllowed': 'આ ફાઇલ પ્રકારની મંજૂરી નથી. મંજૂર પ્રકારો: {{types}}.',
  'middleware.error.fileMissing': '"{{field}}" ફીલ્ડમાં ફાઇલ મોકલો.',
  'middleware.error.tooManyFiles': 'ઘણી બધી ફાઇલો. મર્યાદા {{max}} છે.',
  'middleware.error.unexpectedFile': 'ફાઇલ "{{field}}" નહીં, "{{expected}}" ફીલ્ડમાં મોકલો.',
  'middleware.error.notMultipart': 'ફાઇલને multipart/form-data તરીકે "{{field}}" ફીલ્ડમાં મોકલો.',
  'middleware.error.payloadTooLarge': 'વિનંતી ખૂબ મોટી છે.',
}
