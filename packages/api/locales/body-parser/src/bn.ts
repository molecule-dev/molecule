import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Bengali. */
export const bn: BodyParserTranslations = {
  'middleware.error.badRequest': 'অবৈধ অনুরোধ।',
  'middleware.error.fileTooLarge': 'ফাইলটি {{limit}}-এর চেয়ে বড়।',
  'middleware.error.fileTypeNotAllowed': 'এই ধরনের ফাইল অনুমোদিত নয়। অনুমোদিত ধরন: {{types}}।',
  'middleware.error.fileMissing': '"{{field}}" ফিল্ডে একটি ফাইল পাঠান।',
  'middleware.error.tooManyFiles': 'অনেক বেশি ফাইল। সীমা হলো {{max}}।',
  'middleware.error.unexpectedFile': 'ফাইলটি "{{field}}" নয়, "{{expected}}" ফিল্ডে পাঠান।',
  'middleware.error.notMultipart': 'ফাইলটি multipart/form-data হিসেবে "{{field}}" ফিল্ডে পাঠান।',
  'middleware.error.payloadTooLarge': 'অনুরোধটি অনেক বড়।',
}
