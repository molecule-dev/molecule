import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Telugu. */
export const te: BodyParserTranslations = {
  'middleware.error.badRequest': 'చెడ్డ అభ్యర్థన.',
  'middleware.error.fileTooLarge': 'ఫైల్ {{limit}} కంటే పెద్దదిగా ఉంది.',
  'middleware.error.fileTypeNotAllowed': 'ఈ ఫైల్ రకం అనుమతించబడదు. అనుమతించబడిన రకాలు: {{types}}.',
  'middleware.error.fileMissing': '"{{field}}" ఫీల్డ్‌లో ఫైల్‌ను పంపండి.',
  'middleware.error.tooManyFiles': 'చాలా ఎక్కువ ఫైల్‌లు. పరిమితి {{max}}.',
  'middleware.error.unexpectedFile': 'ఫైల్‌ను "{{field}}" కాదు, "{{expected}}" ఫీల్డ్‌లో పంపండి.',
  'middleware.error.notMultipart': 'ఫైల్‌ను multipart/form-data గా "{{field}}" ఫీల్డ్‌లో పంపండి.',
  'middleware.error.payloadTooLarge': 'అభ్యర్థన చాలా పెద్దదిగా ఉంది.',
}
