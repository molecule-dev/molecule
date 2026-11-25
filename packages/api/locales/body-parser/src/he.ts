import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Hebrew. */
export const he: BodyParserTranslations = {
  'middleware.error.badRequest': 'בקשה שגויה.',
  'middleware.error.fileTooLarge': 'הקובץ גדול מ-{{limit}}.',
  'middleware.error.fileTypeNotAllowed': 'סוג קובץ זה אינו מותר. סוגים מותרים: {{types}}.',
  'middleware.error.fileMissing': 'שלחו קובץ בשדה "{{field}}".',
  'middleware.error.tooManyFiles': 'יותר מדי קבצים. המגבלה היא {{max}}.',
  'middleware.error.unexpectedFile': 'שלחו את הקובץ בשדה "{{expected}}", לא "{{field}}".',
  'middleware.error.notMultipart': 'שלחו את הקובץ כ-multipart/form-data בשדה "{{field}}".',
  'middleware.error.payloadTooLarge': 'הבקשה גדולה מדי.',
}
