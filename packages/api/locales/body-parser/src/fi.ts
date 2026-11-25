import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Finnish. */
export const fi: BodyParserTranslations = {
  'middleware.error.badRequest': 'Virheellinen pyyntö.',
  'middleware.error.fileTooLarge': 'Tiedosto on suurempi kuin {{limit}}.',
  'middleware.error.fileTypeNotAllowed':
    'Tämä tiedostotyyppi ei ole sallittu. Sallitut tyypit: {{types}}.',
  'middleware.error.fileMissing': 'Lähetä tiedosto kentässä "{{field}}".',
  'middleware.error.tooManyFiles': 'Liian monta tiedostoa. Raja on {{max}}.',
  'middleware.error.unexpectedFile': 'Lähetä tiedosto kentässä "{{expected}}", ei "{{field}}".',
  'middleware.error.notMultipart':
    'Lähetä tiedosto multipart/form-data-muodossa kentässä "{{field}}".',
  'middleware.error.payloadTooLarge': 'Pyyntö on liian suuri.',
}
