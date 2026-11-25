import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Hindi. */
export const hi: BodyParserTranslations = {
  'middleware.error.badRequest': 'खराब अनुरोध।',
  'middleware.error.fileTooLarge': 'फ़ाइल {{limit}} से बड़ी है।',
  'middleware.error.fileTypeNotAllowed':
    'इस प्रकार की फ़ाइल की अनुमति नहीं है। अनुमत प्रकार: {{types}}।',
  'middleware.error.fileMissing': '"{{field}}" फ़ील्ड में एक फ़ाइल भेजें।',
  'middleware.error.tooManyFiles': 'बहुत अधिक फ़ाइलें। सीमा {{max}} है।',
  'middleware.error.unexpectedFile': 'फ़ाइल "{{field}}" नहीं, "{{expected}}" फ़ील्ड में भेजें।',
  'middleware.error.notMultipart':
    'फ़ाइल को multipart/form-data के रूप में "{{field}}" फ़ील्ड में भेजें।',
  'middleware.error.payloadTooLarge': 'अनुरोध बहुत बड़ा है।',
}
