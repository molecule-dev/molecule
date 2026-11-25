import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Chinese (Traditional). */
export const zhTW: BodyParserTranslations = {
  'middleware.error.badRequest': '錯誤的請求。',
  'middleware.error.fileTooLarge': '檔案大於 {{limit}}。',
  'middleware.error.fileTypeNotAllowed': '不允許此檔案類型。允許的類型：{{types}}。',
  'middleware.error.fileMissing': '請在 "{{field}}" 欄位中傳送檔案。',
  'middleware.error.tooManyFiles': '檔案過多。上限為 {{max}}。',
  'middleware.error.unexpectedFile': '請在 "{{expected}}" 欄位中傳送檔案，而非 "{{field}}"。',
  'middleware.error.notMultipart': '請以 multipart/form-data 格式在 "{{field}}" 欄位中傳送檔案。',
  'middleware.error.payloadTooLarge': '請求過大。',
}
