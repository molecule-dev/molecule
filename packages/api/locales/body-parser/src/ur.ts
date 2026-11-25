import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Urdu. */
export const ur: BodyParserTranslations = {
  'middleware.error.badRequest': 'خراب درخواست۔',
  'middleware.error.fileTooLarge': 'فائل {{limit}} سے بڑی ہے۔',
  'middleware.error.fileTypeNotAllowed':
    'اس قسم کی فائل کی اجازت نہیں ہے۔ اجازت شدہ اقسام: {{types}}۔',
  'middleware.error.fileMissing': '"{{field}}" فیلڈ میں ایک فائل بھیجیں۔',
  'middleware.error.tooManyFiles': 'بہت زیادہ فائلیں۔ حد {{max}} ہے۔',
  'middleware.error.unexpectedFile': 'فائل "{{field}}" کے بجائے "{{expected}}" فیلڈ میں بھیجیں۔',
  'middleware.error.notMultipart':
    'فائل کو multipart/form-data کے طور پر "{{field}}" فیلڈ میں بھیجیں۔',
  'middleware.error.payloadTooLarge': 'درخواست بہت بڑی ہے۔',
}
