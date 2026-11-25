import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Chinese. */
export const zh: BodyParserTranslations = {
  'middleware.error.badRequest': '错误的请求。',
  'middleware.error.fileTooLarge': '文件大于 {{limit}}。',
  'middleware.error.fileTypeNotAllowed': '不允许此文件类型。允许的类型：{{types}}。',
  'middleware.error.fileMissing': '请在 "{{field}}" 字段中发送文件。',
  'middleware.error.tooManyFiles': '文件过多。上限为 {{max}}。',
  'middleware.error.unexpectedFile': '请在 "{{expected}}" 字段中发送文件，而不是 "{{field}}"。',
  'middleware.error.notMultipart': '请以 multipart/form-data 格式在 "{{field}}" 字段中发送文件。',
  'middleware.error.payloadTooLarge': '请求过大。',
}
