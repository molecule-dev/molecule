import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Vietnamese. */
export const vi: BodyParserTranslations = {
  'middleware.error.badRequest': 'Yêu cầu không hợp lệ.',
  'middleware.error.fileTooLarge': 'Tệp lớn hơn {{limit}}.',
  'middleware.error.fileTypeNotAllowed':
    'Loại tệp này không được phép. Các loại được phép: {{types}}.',
  'middleware.error.fileMissing': 'Gửi một tệp trong trường "{{field}}".',
  'middleware.error.tooManyFiles': 'Quá nhiều tệp. Giới hạn là {{max}}.',
  'middleware.error.unexpectedFile': 'Gửi tệp trong trường "{{expected}}", không phải "{{field}}".',
  'middleware.error.notMultipart':
    'Gửi tệp dưới dạng multipart/form-data trong trường "{{field}}".',
  'middleware.error.payloadTooLarge': 'Yêu cầu quá lớn.',
}
