import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Latvian. */
export const lv: BodyParserTranslations = {
  'middleware.error.badRequest': 'Slikts pieprasījums.',
  'middleware.error.fileTooLarge': 'Fails ir lielāks par {{limit}}.',
  'middleware.error.fileTypeNotAllowed': 'Šis faila tips nav atļauts. Atļautie tipi: {{types}}.',
  'middleware.error.fileMissing': 'Nosūtiet failu laukā "{{field}}".',
  'middleware.error.tooManyFiles': 'Pārāk daudz failu. Ierobežojums ir {{max}}.',
  'middleware.error.unexpectedFile': 'Nosūtiet failu laukā "{{expected}}", nevis "{{field}}".',
  'middleware.error.notMultipart': 'Nosūtiet failu kā multipart/form-data laukā "{{field}}".',
  'middleware.error.payloadTooLarge': 'Pieprasījums ir pārāk liels.',
}
