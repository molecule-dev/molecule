import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Uzbek. */
export const uz: BodyParserTranslations = {
  'middleware.error.badRequest': "Noto'g'ri so'rov.",
  'middleware.error.fileTooLarge': 'Fayl {{limit}} dan katta.',
  'middleware.error.fileTypeNotAllowed':
    'Bu fayl turiga ruxsat berilmagan. Ruxsat etilgan turlar: {{types}}.',
  'middleware.error.fileMissing': '"{{field}}" maydonida fayl yuboring.',
  'middleware.error.tooManyFiles': 'Fayllar juda koʻp. Cheklov: {{max}}.',
  'middleware.error.unexpectedFile': 'Faylni "{{field}}" emas, "{{expected}}" maydonida yuboring.',
  'middleware.error.notMultipart':
    'Faylni multipart/form-data sifatida "{{field}}" maydonida yuboring.',
  'middleware.error.payloadTooLarge': 'Soʻrov juda katta.',
}
