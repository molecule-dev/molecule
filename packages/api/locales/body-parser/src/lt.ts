import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Lithuanian. */
export const lt: BodyParserTranslations = {
  'middleware.error.badRequest': 'Bloga užklausa.',
  'middleware.error.fileTooLarge': 'Failas didesnis nei {{limit}}.',
  'middleware.error.fileTypeNotAllowed':
    'Šis failo tipas neleidžiamas. Leidžiami tipai: {{types}}.',
  'middleware.error.fileMissing': 'Siųskite failą lauke "{{field}}".',
  'middleware.error.tooManyFiles': 'Per daug failų. Riba yra {{max}}.',
  'middleware.error.unexpectedFile': 'Siųskite failą lauke "{{expected}}", o ne "{{field}}".',
  'middleware.error.notMultipart': 'Siųskite failą kaip multipart/form-data lauke "{{field}}".',
  'middleware.error.payloadTooLarge': 'Užklausa per didelė.',
}
