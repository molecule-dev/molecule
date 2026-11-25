import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Persian. */
export const fa: BodyParserTranslations = {
  'middleware.error.badRequest': 'درخواست نامعتبر.',
  'middleware.error.fileTooLarge': 'حجم فایل بیشتر از {{limit}} است.',
  'middleware.error.fileTypeNotAllowed': 'این نوع فایل مجاز نیست. انواع مجاز: {{types}}.',
  'middleware.error.fileMissing': 'یک فایل در فیلد "{{field}}" ارسال کنید.',
  'middleware.error.tooManyFiles': 'تعداد فایل‌ها زیاد است. حد مجاز {{max}} است.',
  'middleware.error.unexpectedFile': 'فایل را در فیلد "{{expected}}" ارسال کنید، نه "{{field}}".',
  'middleware.error.notMultipart':
    'فایل را به صورت multipart/form-data در فیلد "{{field}}" ارسال کنید.',
  'middleware.error.payloadTooLarge': 'درخواست بیش از حد بزرگ است.',
}
