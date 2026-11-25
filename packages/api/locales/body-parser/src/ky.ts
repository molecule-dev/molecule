import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Kyrgyz. */
export const ky: BodyParserTranslations = {
  'middleware.error.badRequest': 'Жаман суроо.',
  'middleware.error.fileTooLarge': 'Файл {{limit}} чегинен чоң.',
  'middleware.error.fileTypeNotAllowed':
    'Бул файл түрүнө уруксат жок. Уруксат берилген түрлөр: {{types}}.',
  'middleware.error.fileMissing': '"{{field}}" талаасында файл жөнөтүңүз.',
  'middleware.error.tooManyFiles': 'Файлдар өтө көп. Чеги: {{max}}.',
  'middleware.error.unexpectedFile':
    'Файлды "{{field}}" эмес, "{{expected}}" талаасында жөнөтүңүз.',
  'middleware.error.notMultipart':
    'Файлды multipart/form-data катары "{{field}}" талаасында жөнөтүңүз.',
  'middleware.error.payloadTooLarge': 'Суроо өтө чоң.',
}
