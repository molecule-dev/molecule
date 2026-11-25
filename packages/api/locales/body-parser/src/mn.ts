import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Mongolian. */
export const mn: BodyParserTranslations = {
  'middleware.error.badRequest': 'Буруу хүсэлт.',
  'middleware.error.fileTooLarge': 'Файл {{limit}}-аас том байна.',
  'middleware.error.fileTypeNotAllowed':
    'Энэ төрлийн файлыг зөвшөөрөхгүй. Зөвшөөрөгдсөн төрлүүд: {{types}}.',
  'middleware.error.fileMissing': '"{{field}}" талбарт файл илгээнэ үү.',
  'middleware.error.tooManyFiles': 'Хэт олон файл байна. Хязгаар нь {{max}}.',
  'middleware.error.unexpectedFile': 'Файлыг "{{field}}" биш, "{{expected}}" талбарт илгээнэ үү.',
  'middleware.error.notMultipart':
    'Файлыг multipart/form-data хэлбэрээр "{{field}}" талбарт илгээнэ үү.',
  'middleware.error.payloadTooLarge': 'Хүсэлт хэт том байна.',
}
