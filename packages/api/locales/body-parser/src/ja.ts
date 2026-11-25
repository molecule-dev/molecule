import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Japanese. */
export const ja: BodyParserTranslations = {
  'middleware.error.badRequest': '不正なリクエストです。',
  'middleware.error.fileTooLarge': 'ファイルが {{limit}} を超えています。',
  'middleware.error.fileTypeNotAllowed':
    'このファイル形式は許可されていません。許可されている形式: {{types}}。',
  'middleware.error.fileMissing': '"{{field}}" フィールドでファイルを送信してください。',
  'middleware.error.tooManyFiles': 'ファイルが多すぎます。上限は {{max}} です。',
  'middleware.error.unexpectedFile':
    'ファイルは "{{field}}" ではなく "{{expected}}" フィールドで送信してください。',
  'middleware.error.notMultipart':
    'ファイルを multipart/form-data として "{{field}}" フィールドで送信してください。',
  'middleware.error.payloadTooLarge': 'リクエストが大きすぎます。',
}
