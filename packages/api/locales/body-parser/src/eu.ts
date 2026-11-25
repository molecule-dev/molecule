import type { BodyParserTranslations } from './types.js'

/** Body Parser translations for Basque. */
export const eu: BodyParserTranslations = {
  'middleware.error.badRequest': 'Eskaera okerra.',
  'middleware.error.fileTooLarge': 'Fitxategia {{limit}} baino handiagoa da.',
  'middleware.error.fileTypeNotAllowed':
    'Fitxategi mota hau ez dago baimenduta. Baimendutako motak: {{types}}.',
  'middleware.error.fileMissing': 'Bidali fitxategi bat "{{field}}" eremuan.',
  'middleware.error.tooManyFiles': 'Fitxategi gehiegi. Muga {{max}} da.',
  'middleware.error.unexpectedFile':
    'Bidali fitxategia "{{expected}}" eremuan, ez "{{field}}" eremuan.',
  'middleware.error.notMultipart':
    'Bidali fitxategia multipart/form-data gisa "{{field}}" eremuan.',
  'middleware.error.payloadTooLarge': 'Eskaera handiegia da.',
}
