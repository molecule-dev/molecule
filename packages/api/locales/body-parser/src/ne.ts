import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Nepali. */
export const ne: BodyParserTranslations = {
  'middleware.error.badRequest': 'खराब अनुरोध।',
  'middleware.error.fileTooLarge': 'फाइल {{limit}} भन्दा ठूलो छ।',
  'middleware.error.fileTypeNotAllowed':
    'यो प्रकारको फाइलको अनुमति छैन। अनुमति दिइएका प्रकारहरू: {{types}}।',
  'middleware.error.fileMissing': '"{{field}}" फिल्डमा फाइल पठाउनुहोस्।',
  'middleware.error.tooManyFiles': 'धेरै फाइलहरू। सीमा {{max}} हो।',
  'middleware.error.unexpectedFile': 'फाइल "{{field}}" होइन, "{{expected}}" फिल्डमा पठाउनुहोस्।',
  'middleware.error.notMultipart':
    'फाइललाई multipart/form-data को रूपमा "{{field}}" फिल्डमा पठाउनुहोस्।',
  'middleware.error.payloadTooLarge': 'अनुरोध धेरै ठूलो छ।',
}
