import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Georgian. */
export const ka: BodyParserTranslations = {
  'middleware.error.badRequest': 'Tsudi motkhovna.',
  'middleware.error.fileTooLarge': 'ფაილი {{limit}}-ზე დიდია.',
  'middleware.error.fileTypeNotAllowed':
    'ამ ტიპის ფაილი დაშვებული არ არის. დაშვებული ტიპები: {{types}}.',
  'middleware.error.fileMissing': 'გაგზავნეთ ფაილი ველში "{{field}}".',
  'middleware.error.tooManyFiles': 'ძალიან ბევრი ფაილია. ლიმიტია {{max}}.',
  'middleware.error.unexpectedFile': 'გაგზავნეთ ფაილი ველში "{{expected}}" და არა "{{field}}".',
  'middleware.error.notMultipart': 'გაგზავნეთ ფაილი როგორც multipart/form-data ველში "{{field}}".',
  'middleware.error.payloadTooLarge': 'მოთხოვნა ძალიან დიდია.',
}
