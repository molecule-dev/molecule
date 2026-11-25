import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Kazakh. */
export const kk: BodyParserTranslations = {
  'middleware.error.badRequest': 'Жарамсыз сұраныс.',
  'middleware.error.fileTooLarge': 'Файл {{limit}} шегінен үлкен.',
  'middleware.error.fileTypeNotAllowed':
    'Бұл файл түріне рұқсат етілмейді. Рұқсат етілген түрлер: {{types}}.',
  'middleware.error.fileMissing': '"{{field}}" өрісінде файл жіберіңіз.',
  'middleware.error.tooManyFiles': 'Файлдар тым көп. Шегі: {{max}}.',
  'middleware.error.unexpectedFile': 'Файлды "{{field}}" емес, "{{expected}}" өрісінде жіберіңіз.',
  'middleware.error.notMultipart':
    'Файлды multipart/form-data ретінде "{{field}}" өрісінде жіберіңіз.',
  'middleware.error.payloadTooLarge': 'Сұрау тым үлкен.',
}
