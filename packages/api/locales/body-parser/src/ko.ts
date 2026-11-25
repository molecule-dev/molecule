import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Korean. */
export const ko: BodyParserTranslations = {
  'middleware.error.badRequest': '잘못된 요청입니다.',
  'middleware.error.fileTooLarge': '파일이 {{limit}}보다 큽니다.',
  'middleware.error.fileTypeNotAllowed':
    '이 파일 형식은 허용되지 않습니다. 허용되는 형식: {{types}}.',
  'middleware.error.fileMissing': '"{{field}}" 필드에 파일을 보내세요.',
  'middleware.error.tooManyFiles': '파일이 너무 많습니다. 최대 {{max}}개입니다.',
  'middleware.error.unexpectedFile': '파일을 "{{field}}"가 아닌 "{{expected}}" 필드에 보내세요.',
  'middleware.error.notMultipart': '파일을 multipart/form-data로 "{{field}}" 필드에 보내세요.',
  'middleware.error.payloadTooLarge': '요청이 너무 큽니다.',
}
